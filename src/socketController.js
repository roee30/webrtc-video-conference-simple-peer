
class ServerParticipant {
    constructor(peer){
        this.peer=peer;
        this.offset = {x: Math.random() * 1000, y: Math.random() * 1000};
    }
    emit(...args){
        this.peer.emit(...args);
    }
    moveBy(moveBy) {
        console.log(`moveBy(${JSON.stringify(moveBy)})`);
        let {axis,direction} = moveBy;
        this.offset[axis] += 50 * direction;
    }
}
peers = {}


module.exports = (io) => {
    io.on('connect', (socket) => {
        console.log('a client is connected')


        // Initiate the connection process as soon as the client connects

        let thisParticipant = peers[socket.id] = new ServerParticipant(socket);

        // Asking all other clients to setup the peer connection receiver
        for(let id in peers) {
            if(id === socket.id) continue
            console.log('sending init receive to ' + socket.id)
            peers[id].emit('initReceive', socket.id)
        }
        socket.emit('setOwnLocation', {offset: thisParticipant.offset})

        /**
         * relay a peerconnection signal to a specific socket
         */
        socket.on('signal', data => {
            console.log('sending signal from ' + socket.id + ' to ', data)
            let peer = peers[data.socket_id];
            if(!peer){
                console.log(`peer ${data.socket_id} does not exist`);
                return;
            }
            peer.emit('signal', {
                socket_id: socket.id,
                signal: data.signal
            })
        })

        /**
         * remove the disconnected peer connection from all other connected clients
         */
        socket.on('disconnect', () => {
            console.log('socket disconnected ' + socket.id)
            socket.broadcast.emit('removePeer', socket.id)
            delete peers[socket.id]
        })

        socket.on('move', data=>{
            console.log(`moving: ${socket.id}`);
            let participant = peers[socket.id];
            participant.moveBy(data);
            let offset = {offset: participant.offset};
            console.log(`new offset for ${socket.id}: ${JSON.stringify(offset)}`);
            socket.emit('setOwnLocation', offset);
            socket.broadcast.emit('setLocation', {socket: socket.id, ...offset});
        })

        /**
         * Send message to client to initiate a connection
         * The sender has already setup a peer connection receiver
         */
        socket.on('initSend', init_socket_id => {
            console.log('INIT SEND by ' + socket.id + ' for ' + init_socket_id)
            let peer = peers[init_socket_id];
            peer.emit('initSend', socket.id)
        })
        socket.on('sendLocation',(id)=>{
            socket.emit('setLocation', {socket: id, offset: peers[id].offset})
        })
    })
}