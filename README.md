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

## Admin

O PIN inicial do protótipo é:

```text
1234
```

Para trocar, edite a constante `ADMIN_PIN` no arquivo `app.js`.

> Esse PIN apenas esconde ou mostra os botões no navegador. Para produção, use Firebase Auth e regras do Firestore.

## Firestore

O app usa a coleção:

```text
composicoes
```

Campos gravados:

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

## Regras para teste

No Firebase Console, habilite o Firestore Database. Para testar rapidamente, você pode usar regras abertas por tempo limitado:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /composicoes/{document} {
      allow read, write: if true;
    }
  }
}
```

Para uso real, troque por regras com autenticação de admin.
