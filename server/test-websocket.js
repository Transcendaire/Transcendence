
import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8080/ws');

ws.on('open', () => {
    console.log('✅ WebSocket connected');
    ws.send(JSON.stringify({ type: 'input', playerId: 'test123', input: 'up' }));
});

ws.on('message', (data) => {
    console.log('📥 Received:', JSON.parse(data.toString()));
    
    // Test sending input after joining
    setTimeout(() => {
        console.log('📤 Sending input...');
        ws.send(JSON.stringify({ 
            type: 'input', 
            playerId: 'test123', 
            input: 'up' 
        }));
    }, 1000);
});

ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message);
});

ws.on('close', () => {
    console.log('🔌 Connection closed');
});