import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";

//Criação do servidor
const app = express();

//Configurações do servidor
app.use(cors());
app.use(express.json());
dotenv.config();

//Setup do banco de dados
const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
  await mongoClient.connect();
} catch (err) {
  console.log(err.message);
}
const db = mongoClient.db();

//Adiciona participante
app.post("/participants", async (req, res) => {
  const { name } = req.body;
  try {
    const usuario = await db.collection("participants").findOne({name:name});
    if (usuario) return res.sendStatus(409);
    await db.collection("participants").insertOne({ name, lastStatus: Date.now() });
    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err.message); //erro placeholder
  } 
});

//Retorna participantes ativos
app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.status(200).send(participants);    
  } catch (err) {
    res.status(500);
  }
});

//Posta mensagem
app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const user = req.headers.user;
  try {
    await db.collection("messages").insertOne({
      from: user,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    })
    res.send(user);
  } catch (err) {
    res.status(500); //erro placeholder
  }  
});

//Retorna todas as mensagens
app.get("/messages", async (req, res) => {
  try {
    const messages = await db.collection("messages").find().toArray();
    res.status(200).send(messages);
  } catch (err) {
    res.status(500)
  }  
});

//Posta status
app.post("/status", async (req, res) => {
  const user = req.headers.user;
  try {
    res.send(user);
  } catch (err) {
    console.log(err);
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
