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
  let now = dayjs();
  db.collection("participants")
    .insertOne({ name, lastStatus: Date.now() })
    .then(() => res.status(201))
    .catch((err) => console.log(err.message));
  db.collection("messages").insertOne({
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: now.format("HH:mm:ss"),
  }).then(() => res.status(201))
  .catch((err) => console.log(err.message));
});

//
app.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((participants) => res.status(200).send(participants))
    .catch(res.status(500));
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
