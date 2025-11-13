import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB, getDB } from "./db.js";
import { ObjectId } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));

await connectDB(process.env.MONGO_URL, process.env.DB_NAME);
const db = getDB();
const coursesCol = db.collection(process.env.COURSES_COLLECTION);
const studentsCol = db.collection(process.env.STUDENTS_COLLECTION);

app.get('/api/heartbeat', (req, res) => {
    res.json({ ok: true })
})

app.get('/api/courses', async (req, res) => {
    const list = await coursesCol.find({}).toArray();
    res.status(200).json(list)
})

app.get('/api/courses/:code', async (req, res) => {
    console.log(req.params.code);
    const list = await coursesCol.findOne({code:req.params.code});
    res.status(200).json(list)
})

app.put('/api/courses/:code', async (req, res) => {
    const _title = req.body.title;
    const _code = req.body.code;
    const _credit_nbr = req.body.credit_nbr;
    const list = await coursesCol.findOneAndUpdate(
        {code:req.params.code},
        {
            $set:
            {
                code:_code,
                title:_title,
                creditNbr:_credit_nbr
            }
        }
        );
    res.status(200).send('ok')
})

app.post("/api/courses", async (req, res) => {
  const { title, code } = req.body;
  if (!title || !code) return res.status(400).json({ error: "title and code are required" });
  const exists = await coursesCol.findOne({ code });
  if (exists) return res.status(409).json({ error: "Course code already exists" });
  const result = await coursesCol.insertOne({ title, code });
  const saved = await coursesCol.findOne({ _id: result.insertedId });
  res.status(201).json(saved);
});

app.delete("/api/courses/:id", async (req, res) => {
  const id = req.params.id;
  const result = await coursesCol.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });
  await studentsCol.updateMany({}, { $pull: { registeredCourses: { courseId: id } } });
  res.json({ ok: true });
});

app.get("/api/students", async (req, res) => {
  const { name } = req.query;
  const filter = name ? { name: { $regex: name, $options: "i" } } : {};
  const list = await studentsCol.find(filter).sort({ name: 1 }).toArray();
  res.json(list);
});

app.get("/api/students/:id", async (req, res) => {
  const doc = await studentsCol.findOne({ _id: new ObjectId(req.params.id) });
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

app.post("/api/students", async (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const result = await studentsCol.insertOne({ name, email: email || null, registeredCourses: [] });
  const saved = await studentsCol.findOne({ _id: result.insertedId });
  res.status(201).json(saved);
});

app.put("/api/students/:id", async (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const result = await studentsCol.findOneAndUpdate(
    { _id: new ObjectId(req.params.id) },
    { $set: { name, email: email || null } },
    { returnDocument: "after" }
  );
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json(result);
});

app.delete("/api/students/:id", async (req, res) => {
  const result = await studentsCol.deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

app.post("/api/students/:id/register", async (req, res) => {
  const studentId = req.params.id;
  const { courseId } = req.body;
  if (!courseId) return res.status(400).json({ error: "courseId is required" });
  const student = await studentsCol.findOne({ _id: new ObjectId(studentId) });
  const course = await coursesCol.findOne({ _id: new ObjectId(courseId) });
  if (!student) return res.status(404).json({ error: "Student not found" });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const already = await studentsCol.findOne({
    _id: new ObjectId(studentId),
    "registeredCourses.courseId": courseId
  });
  if (already) return res.status(409).json({ error: "Already registered" });

  const embedded = {
    courseId: course._id.toString(),
    title: course.title,
    code: course.code,
    registeredAt: new Date().toISOString()
  };

  const updated = await studentsCol.findOneAndUpdate(
    { _id: new ObjectId(studentId) },
    { $push: { registeredCourses: embedded } },
    { returnDocument: "after" }
  );
  res.json(updated);
});

app.post("/api/students/:id/unregister", async (req, res) => {
  const studentId = req.params.id;
  const { courseId } = req.body;
  if (!courseId) return res.status(400).json({ error: "courseId is required" });
  const student = await studentsCol.findOne({ _id: new ObjectId(studentId) });
  if (!student) return res.status(404).json({ error: "Student not found" });
  const updated = await studentsCol.findOneAndUpdate(
    { _id: new ObjectId(studentId) },
    { $pull: { registeredCourses: { courseId } } },
    { returnDocument: "after" }
  );
  res.json(updated);
});

app.post("/api/seed", async (req, res) => {
  const courses = [
    { title: "Intro to Programming", code: "CS101" },
    { title: "Data Structures", code: "CS201" },
    { title: "Web Development", code: "WEB101" },
    { title: "Databases", code: "DB101" },
    { title: "Operating Systems", code: "OS201" }
  ];
  const students = [
    { name: "Alice Johnson", email: "alice@example.com", registeredCourses: [] },
    { name: "Bob Smith", email: "bob@example.com", registeredCourses: [] },
    { name: "Carla Haddad", email: "carla@example.com", registeredCourses: [] }
  ];
  await coursesCol.deleteMany({});
  await studentsCol.deleteMany({});
  await coursesCol.insertMany(courses);
  await studentsCol.insertMany(students);
  res.json({ ok: true });
});





app.use((req, res) => {
  const indexPath = path.join(__dirname, "../index.html");
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error loading the page.');
    }
    const API_URL = process.env.API_URL || 'http://localhost:3000/api'; // Fallback
    const modifiedData = data.replace(
      '<script id="api-config"></script>',
      `<script id="api-config">window.API_URL = '${API_URL}';</script>`
    );
    res.send(modifiedData);
  });
});



const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Server http://localhost:${port}`));
