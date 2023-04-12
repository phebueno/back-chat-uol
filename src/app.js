import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

//Criação do servidor
const app = express();

//Configurações do servidor
app.use(cors());
app.use(express.json());

//Setup do banco de dados
let db;
const mongoClient = new MongoClient("mongodb://localhost:27017/nomeDoBanco");
mongoClient
  .connect()
  .then(() => (db = mongoClient.db))
  .catch((err) => console.log(err.message));

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
