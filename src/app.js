import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";
import { stripHtml } from "string-strip-html";

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

//Validações
const userSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.valid("message", "private_message").required(),
});

const messageLimitSchema = joi.object({
  limit: joi.number().integer().min(1),
});

//Sanitização de dados
function dataSanitize(data) {
  let cleanData = stripHtml(data).result.trim();
  return cleanData;
}
//Adiciona participante
app.post("/participants", async (req, res) => {
  let { name } = req.body;
  name = dataSanitize(name);
  const validation = userSchema.validate(req.body);
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.sendStatus(422);
  }

  try {
    const usuario = await db.collection("participants").findOne({ name });
    if (usuario) return res.sendStatus(409);
    await db
      .collection("participants")
      .insertOne({ name, lastStatus: Date.now() });
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

  const validation = messageSchema.validate(req.body);
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.sendStatus(422);
  }

  try {
    const usuarioFrom = await db
      .collection("participants")
      .findOne({ name: user });
    if (!usuarioFrom) return res.sendStatus(422);
    await db.collection("messages").insertOne({
      from: user,
      to,
      text: dataSanitize(text),
      type,
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (err) {
    res.status(500); //erro placeholder
  }
});

//Retorna todas as mensagens
app.get("/messages", async (req, res) => {
  const user = req.headers.user;
  const limit = Number(req.query.limit);

  const validation = messageLimitSchema.validate(req.query);
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.sendStatus(422);
  }

  try {
    const messages = await db
      .collection("messages")
      .find({
        $or: [
          { type: "message" },
          { type: "status" },
          { $or: [{ from: user }, { to: user }, { to: "Todos" }] },
        ],
      })
      .toArray();
    if (limit) {
      //adicionar validação joi
      return res.status(200).send(messages.slice(-limit));
    }
    res.status(200).send(messages);
  } catch (err) {
    res.status(500);
  }
});

//Deleta uma mensagem por ID
app.delete("/messages/:id", async (req, res) => {
  const user = req.headers.user;
  const id = req.params.id;
  try {
    const deletedObj = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });
    if (!deletedObj) return res.sendStatus(404);
    if (deletedObj.from !== user) return res.sendStatus(401);
    const result = await db
      .collection("messages")
      .deleteOne({ _id: new ObjectId(id) });
    //if(!result) return res.sendStatus(404);
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

//Edita uma mensagem por ID
app.put("/messages/:id", async (req, res) => {
  const user = req.headers.user;
  const id = req.params.id;
  const { to, text, type } = req.body;
  const userUpdate = { from: user, to, text: dataSanitize(text), type };

  const validation = messageSchema.validate(req.body);
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.sendStatus(422);
  }

  try {
    const usuarioFrom = await db
      .collection("participants")
      .findOne({ name: user });
    if (!usuarioFrom) return res.sendStatus(422); //adicionar outras validaçṍes por joi
    const updateObj = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });
    if (!updateObj) return res.sendStatus(404);
    if (updateObj.from !== user) return res.sendStatus(401);
    const result = await db
      .collection("messages")
      .updateOne({ _id: new ObjectId(id) }, { $set: userUpdate });
    console.log(updateObj);
    res.send("Mensagem atualizada");
  } catch (err) {
    console.log(err);
  }
});

//Posta status
app.post("/status", async (req, res) => {
  const user = req.headers.user;
  const userUpdate = { name: user, lastStatus: Date.now() };
  user;
  try {
    //if (!user) return res.sendStatus(404);
    const result = await db.collection("participants").findOne({ name: user });
    if (!result) return res.sendStatus(404); //Caso user seja vazio, também retornará vazio
    const asd = await db
      .collection("participants")
      .updateOne({ name: user }, { $set: userUpdate });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

//Função que verifica periodicamente se usuários estão online:
setInterval(async () => {
  const now = Date.now();
  const idleTimeLimit = now - 10000;
  try {
    const deletedObj = await db
      .collection("participants")
      .find({ lastStatus: { $lt: idleTimeLimit } })
      .toArray();
    const idle = await db
      .collection("participants")
      .deleteMany({ lastStatus: { $lt: idleTimeLimit } });
    const numDeleted = idle.deletedCount;
    const arrDeleted = [];
    if (numDeleted !== 0) {
      for (let usuario in deletedObj) {
        const info = {
          from: deletedObj[usuario].name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: dayjs().format("HH:mm:ss"),
        };
        arrDeleted.push(info);
      }
      await db.collection("messages").insertMany(arrDeleted);
    }
  } catch (err) {
    console.log(err);
  }
}, 15000);

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
