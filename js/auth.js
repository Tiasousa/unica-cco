// =========================================================
// AUTENTICAÇÃO — Firebase Auth + Firestore (versão real)
// ---------------------------------------------------------
// Este arquivo substitui o login temporário. Ele:
//  1. Faz login/logout de verdade com Firebase Authentication.
//  2. Na primeira vez que cada admin loga, cria automaticamente
//     o perfil dele (nome, cargo) na coleção "usuarios" do
//     Firestore — usando PERFIS_INICIAIS como referência só
//     nesse primeiro momento. Depois disso, quem manda é o
//     Firestore, não este arquivo.
//
// IMPORTANTE: os usuários (e-mail + senha) precisam ser
// criados uma vez em Authentication → Users → Add user, no
// próprio Firebase Console. Este código só faz o LOGIN — ele
// não cria contas novas sozinho.
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// disponíveis globalmente para os próximos módulos (Obras, Frota etc.)
window.firebaseAuth = auth;
window.firebaseDb = db;

// Usado só para preencher nome/cargo na primeira vez que cada
// admin loga. Depois disso os dados moram só no Firestore.
const PERFIS_INICIAIS = {
  "tiago@unicaconstrutora.com":      { nome: "Tiago Sousa",     cargo: "Administrador" },
  "wesley@unicaconstrutora.com":     { nome: "Wesley Teixeira", cargo: "Engenheiro de Obra" },
  "fernanda@unicaconstrutora.com":   { nome: "Fernanda",        cargo: "Administradora" },
  "wellington@unicaconstrutora.com": { nome: "Wellington",      cargo: "Administrador" },
};

async function carregarOuCriarPerfil(user) {
  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const base = PERFIS_INICIAIS[(user.email || "").toLowerCase()]
    || { nome: user.email, cargo: "Administrador" };

  const perfil = {
    nome: base.nome,
    email: user.email,
    cargo: base.cargo,
    papel: "admin",
    ativo: true,
    criadoEm: serverTimestamp(),
  };
  await setDoc(ref, perfil);
  return perfil;
}

function traduzErro(codigo) {
  const mapa = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Este usuário foi desativado.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/missing-password": "Digite a senha.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente de novo.",
    "auth/network-request-failed": "Falha de conexão. Verifique a internet.",
  };
  return mapa[codigo] || "Não foi possível entrar. Tente novamente.";
}

window.sair = function () {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
};

// ---------- Página de login (index.html) ----------
const formLogin = document.getElementById("formLogin");
if (formLogin) {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "app.html";
  });

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const erro = document.getElementById("loginErro");
    const botao = formLogin.querySelector(".btn-entrar");

    erro.classList.remove("ativo");
    botao.textContent = "Entrando...";
    botao.disabled = true;

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      window.location.href = "app.html";
    } catch (err) {
      erro.textContent = traduzErro(err.code);
      erro.classList.add("ativo");
      botao.textContent = "Entrar";
      botao.disabled = false;
    }
  });
}

// ---------- Páginas internas do app (app.html) ----------
if (document.getElementById("areaPagina")) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    let perfil;
    try {
      perfil = await carregarOuCriarPerfil(user);
    } catch (err) {
      console.error("Falha ao carregar perfil do Firestore:", err);
      const base = PERFIS_INICIAIS[(user.email || "").toLowerCase()]
        || { nome: user.email, cargo: "Administrador" };
      perfil = { nome: base.nome, cargo: base.cargo };
    }
    window.dispatchEvent(new CustomEvent("usuarioPronto", { detail: perfil }));
  });
}
