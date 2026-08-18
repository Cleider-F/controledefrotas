# Controle de Frotas

App simples para cadastrar e visualizar composições de frota usando Firebase Firestore.

## Como abrir

Como os arquivos usam módulos JavaScript, rode um servidor local na pasta do projeto:

```powershell
python -m http.server 5173
```

Depois abra:

```text
http://localhost:5173
```

## PWA instalável

O projeto já inclui:

- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- ícones em `assets/`
- banner de instalação no app

Em `localhost`, o navegador permite testar a instalação. Para usuários finais, publique em HTTPS, como Firebase Hosting.

## Autenticação

No Firebase Console, habilite:

- Authentication
- Sign-in method
- E-mail/Senha

O app tem cadastro e login por e-mail e senha. No cadastro, o usuário escolhe entre:

- `Usuário comum`: apenas visualiza as composições.
- `Admin`: visualiza, adiciona, edita e exclui composições.

Na tela de login, o link `Esqueci minha senha` envia o e-mail de redefinição pelo Firebase Authentication. Você pode personalizar esse e-mail em:

```text
Authentication > Templates
```

O código inicial para cadastrar admin é:

```text
FROTAS-ADMIN
```

Para trocar, edite a constante `ADMIN_SIGNUP_CODE` no arquivo `app.js`.

> Esse código fica no front-end e serve para protótipo. Para produção, o ideal é criar admins manualmente no Firestore, usar Cloud Functions ou custom claims.

## Firestore

O app usa as coleções:

```text
composicoes
usuarios
```

Campos gravados em `composicoes`:

- `placa`
- `tipoCavalo`
- `goCarreta`
- `empresa`
- `modal`
- `comCasca`
- `catracas`
- `fueiros`
- `createdAt`
- `updatedAt`

Campos gravados em `usuarios/{uid}`:

- `nome`
- `email`
- `role`: `admin` ou `usuario`
- `createdAt`
- `updatedAt`

## Regras para teste

No Firebase Console, habilite o Firestore Database. Para testar com autenticação e papéis:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return signedIn()
        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == "admin";
    }

    match /composicoes/{document} {
      allow read: if signedIn();
      allow create, update, delete: if isAdmin();
    }

    match /usuarios/{userId} {
      allow read: if signedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if signedIn()
        && request.auth.uid == userId
        && request.resource.data.role in ["admin", "usuario"];
      allow update: if signedIn()
        && (
          isAdmin()
          || (
            request.auth.uid == userId
            && request.resource.data.role == resource.data.role
          )
        );
    }
  }
}
```

Para uso real, evite permitir que qualquer cadastro crie `role: "admin"` só pelo front-end.
