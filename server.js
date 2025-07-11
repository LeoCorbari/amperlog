/**
 * backend/server.js
 *
 * Node.js Express server com Firebase Firestore para gerenciar eventos.
 * 
 * Requisitos:
 * - npm install express cors body-parser firebase-admin socket.io
 * - Baixe o arquivo JSON da conta de serviço do Firebase Admin SDK e salve como `firebase-service-account.json` na raiz do projeto.
 * - Altere o caminho do arquivo e as configurações conforme seu projeto Firebase.
 * 
 * Uso:
 * node server.js
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const {
  v4: uuidv4
} = require('uuid');
const path = require('path');
const http = require('http');
const {
  Server
} = require('socket.io');

// Inicializar Firebase Admin com credenciais da conta de serviço
const serviceAccount = require(path.join(__dirname, 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Ajuste conforme política de CORS
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Coleção Firestore para eventos
const eventsCollection = firestore.collection('events');

// Socket.IO - eventos de conexão
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// GET - Listar todos eventos ordenados por start asc
app.get('/events', async (req, res) => {
  try {
    const snapshot = await eventsCollection.orderBy('start', 'asc').get();
    const events = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      events.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        start: data.start ? data.start.toDate().toISOString() : null,
        end: data.end ? data.end.toDate().toISOString() : null,
        status: data.status,
        isHidden: data.isHidden || false, // Include new isHidden field, default to false
      });
    });
    res.json(events);
  } catch (error) {
    console.error('GET /events error:', error);
    res.status(500).json({
      error: 'Erro ao acessar banco de dados'
    });
  }
});

// Função auxiliar para emitir evento de atualização para todos os clientes
function broadcastEventsUpdate() {
  eventsCollection.orderBy('start', 'asc').get()
    .then(snapshot => {
      const events = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        events.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          start: data.start ? data.start.toDate().toISOString() : null,
          end: data.end ? data.end.toDate().toISOString() : null,
          status: data.status,
          isHidden: data.isHidden || false, // Include new isHidden field
        });
      });
      io.emit('eventsUpdated', events);
    })
    .catch(error => {
      console.error('Erro ao emitir atualização dos eventos:', error);
    });
}

// POST - Criar novo evento
app.post('/events', async (req, res) => {
  const {
    title,
    description,
    start
  } = req.body;
  if (!title || !start) {
    return res.status(400).json({
      error: 'Título e início são obrigatórios.'
    });
  }
  try {
    const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(start));
    const newEvent = {
      title,
      description: description || '',
      start: startTimestamp,
      end: null,
      status: 'ocorrendo',
      isHidden: false, // New field: default to not hidden
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await eventsCollection.add(newEvent);
    const docSnap = await docRef.get();
    const data = docSnap.data();
    const eventCreated = {
      id: docRef.id,
      title: data.title,
      description: data.description,
      start: data.start.toDate().toISOString(),
      end: null,
      status: data.status,
      isHidden: data.isHidden, // Include new isHidden field
    };
    // Emitir evento em tempo real para todos os clientes
    io.emit('eventCreated', eventCreated);
    broadcastEventsUpdate(); // Call the broadcast function
    // MODIFICADO: Emitir objeto com message e type
    io.emit('showToast', {
      message: `Novo evento "${eventCreated.title}" adicionado!`,
      type: 'success'
    });
    res.status(201).json(eventCreated);
  } catch (error) {
    console.error('POST /events error:', error);
    // MODIFICADO: Emitir toast de erro
    io.emit('showToast', {
      message: 'Erro ao adicionar evento.',
      type: 'error'
    });
    res.status(500).json({
      error: 'Erro ao adicionar evento'
    });
  }
});

// PATCH - Atualizar status E/OU isHidden
app.patch('/events/:id', async (req, res) => {
  const {
    id
  } = req.params;
  const {
    status,
    isHidden,
    title,
    description,
    start
  } = req.body; // Adicionado title, description, start

  const updateData = {};
  let toastMessage = ''; // Mensagem para o toast
  let toastType = 'info'; // NOVO: Tipo para o toast

  // Validate and add status to updateData if provided
  if (status !== undefined) {
    if (!['ocorrendo', 'resolvido'].includes(status)) { // Only these two are valid for 'status'
      return res.status(400).json({
        error: 'Status inválido.'
      });
    }
    updateData.status = status;
    if (status === 'resolvido') {
      updateData.end = admin.firestore.Timestamp.now();
      toastMessage = 'Evento marcado como resolvido!';
      toastType = 'success'; // Tipo sucesso
    } else if (status === 'ocorrendo') {
      updateData.end = null; // Clear end date if changing back to 'ocorrendo'
      toastMessage = 'Evento reaberto!';
      toastType = 'warning'; // Tipo aviso
    }
  }

  // Validate and add isHidden to updateData if provided
  if (isHidden !== undefined) {
    if (typeof isHidden !== 'boolean') {
      return res.status(400).json({
        error: 'isHidden deve ser um booleano.'
      });
    }
    updateData.isHidden = isHidden;
    // Se a mensagem de toast já foi definida por status, não sobrescrever,
    // a menos que seja uma atualização de visibilidade pura.
    if (!toastMessage) {
      toastMessage = `Evento ${isHidden ? 'ocultado' : 'mostrado'} com sucesso!`;
      toastType = 'info';
    }
  }

  // Adicionar title, description, start se fornecidos
  if (title !== undefined) {
    updateData.title = title;
    toastMessage = `Evento "${title}" atualizado!`; // Mensagem de atualização para edição
    toastType = 'success';
  }
  if (description !== undefined) {
    updateData.description = description;
    // Se o título já definiu a mensagem, não sobrescrever
    if (!toastMessage && title === undefined) { // Só define se não houver mensagem de título
      toastMessage = `Evento atualizado!`;
      toastType = 'success';
    }
  }
  if (start !== undefined) {
    updateData.start = admin.firestore.Timestamp.fromDate(new Date(start));
    // Se o título já definiu a mensagem, não sobrescrever
    if (!toastMessage && title === undefined) { // Só define se não houver mensagem de título
      toastMessage = `Evento atualizado!`;
      toastType = 'success';
    }
  }


  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      error: 'Nenhum campo válido para atualização fornecido.'
    });
  }

  try {
    const docRef = eventsCollection.doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({
        error: 'Evento não encontrado.'
      });
    }

    await docRef.update(updateData);

    // Após atualização, buscar dados atualizados para emitir
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();
    const eventUpdated = {
      id: updatedDoc.id,
      title: data.title,
      description: data.description,
      start: data.start ? data.start.toDate().toISOString() : null,
      end: data.end ? data.end.toDate().toISOString() : null,
      status: data.status,
      isHidden: data.isHidden, // Include new isHidden field
    };

    io.emit('eventUpdated', eventUpdated);
    broadcastEventsUpdate(); // Call the broadcast function
    if (toastMessage) {
      // MODIFICADO: Emitir objeto com message e type
      io.emit('showToast', {
        message: toastMessage,
        type: toastType
      });
    }
    res.json({
      message: 'Evento atualizado com sucesso.',
      event: eventUpdated
    });
  } catch (error) {
    console.error('PATCH /events/:id error:', error);
    // MODIFICADO: Emitir toast de erro
    io.emit('showToast', {
      message: 'Erro ao atualizar evento.',
      type: 'error'
    });
    res.status(500).json({
      error: 'Erro ao atualizar evento'
    });
  }
});

// DELETE - Apagar evento
app.delete('/events/:id', async (req, res) => {
  const {
    id
  } = req.params;
  try {
    const docRef = eventsCollection.doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({
        error: 'Evento não encontrado.'
      });
    }
    await docRef.delete();

    io.emit('eventDeleted', {
      id
    });
    broadcastEventsUpdate(); // Call the broadcast function
    // MODIFICADO: Emitir objeto com message e type
    io.emit('showToast', {
      message: `Evento "${docSnap.data().title}" excluído!`,
      type: 'info'
    });
    res.json({
      message: 'Evento excluído com sucesso.'
    });
  } catch (error) {
    console.error('DELETE /events/:id error:', error);
    // MODIFICADO: Emitir toast de erro
    io.emit('showToast', {
      message: 'Erro ao excluir evento.',
      type: 'error'
    });
    res.status(500).json({
      error: 'Erro ao excluir evento'
    });
  }
});

// Start server com WebSocket integrado
server.listen(PORT, () => {
  console.log(`Servidor executando em http://localhost:${PORT}`);
  console.log(`WebSocket ativo e esperando conexões...`);
});
