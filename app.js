require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const users = require("./data/users"); // المستخدمين المخزنين في ملف

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "super-secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.set("view engine", "ejs");

// Middleware: محاكاة الفلترة من الخادم الأمامي
// Middleware to rewrite URL from X-Original-URL header if present
app.use((req, res, next) => {
    const originalHeader = req.get("X-Original-URL");
    if (originalHeader) {
        req.url = originalHeader;
    }
    next();
});

// Middleware to block direct access to /admin and /admin/delete unless X-Original-URL header is present
app.use((req, res, next) => {
    const originalHeader = req.get("X-Original-URL");
    if(req.session.role ==="admin") {
        console.log("admin skipped");    
    }
    else if ((req.path === "/admin" || req.path === "/admin/delete") && !originalHeader) {
        return res.status(403).render("blocked");
    }
    next();
});
// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.render("index", { user: req.session.username });
});

// تسجيل الدخول
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    req.session.username = user.username;
    req.session.role = user.role;
    return res.redirect("/myaccount");
  }

  res.render("login", { error: "Invalid credentials" });
});

// تسجيل المستخدم الجديد
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const existing = users.find((u) => u.username === username);

  if (existing) {
    return res.render("register", { error: "User already exists" });
  }

  users.push({ username, password, role: "user" });
  res.redirect("/myaccount");
});
// صفحة حسابي
app.get("/myaccount", (req, res) => {
  if (!req.session.username) {
    return res.redirect("/login");
  }

  res.render("myaccount", {
    username: req.session.username,
    role: req.session.role,
  });
});

// تسجيل الخروج
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// لوحة الإدارة
app.get("/admin", (req, res) => {
  // إرسال فقط المستخدمين العاديين (استبعاد admin)
  const normalUsers = users.filter((u) => u.username !== "admin");
  res.render("admin", { users: normalUsers });
});

// حذف مستخدم (عبر query param)
// app.get("/admin/delete", (req, res) => {
// //   if (req.session.role !== "admin") {
// //     return res.status(403).render("blocked");
// //   }

//   const username = req.params.username;

//   // لا تسمح بحذف حساب الادمن 
// //   if (username === "admin") {
// //     return res.status(400).send("Cannot delete admin user.");
// //   }

//   const userIndex = users.findIndex((u) => u.username === username);
//     console.log(username);
    
//   if (userIndex !== -1) {
//     users.splice(userIndex, 1); // حذف المستخدم
//     res.render("delete", { deletedUser: username }); // 🛠️ تمرير اسم المستخدم المحذوف هنا
//   } else {
//     res.status(404).send("User not found");
//   }
// });

// 
app.get('/admin/delete', (req, res) => {

    const username = req.query.username;
    console.log(req.query);
    
    if (!username) {
        return res.status(400).send('Username query parameter is required.');
    }

    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex !== -1) {
        users.splice(userIndex, 1);
        res.render('delete', { deletedUser: username });
    } else {
        res.status(404).send('User not found');
    }
});
// 
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
