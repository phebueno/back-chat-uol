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
let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);
mongoClient
  .connect()
  .then(() => (db = mongoClient.db()))
  .catch((err) => console.log(err.message));

//Adiciona participante
app.post("/participants", (req, res) => {
  const { name } = req.body;
  db.collection("participants")
    .insertOne({ name, lastStatus: Date.now() })
    .catch((err) => console.log(err.message));
  db.collection("messages")
    .insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    })
    .catch((err) => console.log(err.message));
  res.sendStatus(201);
});

//Retorna participantes ativos
app.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((participants) => res.status(200).send(participants))
    .catch(res.status(500));
});

//Posta mensagem
app.post("/messages", (req, res) => {
  const { to, text, type } = req.body;
  const userFrom = req.headers.user;
  db.collection("messages").insertOne({
    from: userFrom,
    to,
    text,
    type,
    time: dayjs().format("HH:mm:ss"),
  })
  res.send(userFrom);
});

//Retorna todas as mensagens
app.get("/messages", (req, res) => {
  db.collection("messages")
    .find()
    .toArray()
    .then((messages) => res.status(200).send(messages))
    .catch(res.status(500));
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
