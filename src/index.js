const { json } = require('express');
const express = require('express');
const { v4: uuidv4 } = require("uuid"); // yarn add uuid
const app = express();
app.use(json());


/**
 * cpf - string
 * name - string
 * id - uuid
 * statement - []
 */
const customers = []; 

// Middleware
// Next vai definir se deve continuar ou não
function verifyIfExistAccountCPF(request, response, next) {
  const { cpf } = request.headers;
  const customerFound = customers.find(customer => customer.cpf === cpf);

  if(!customerFound) {
    return response.status(400).json({ error: "Customer not found" });
  }

  // Todas rotas que utilizarem esse middleware, vão ter acesso a esse customer dentro do request
  request.customer = customerFound;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if(operation.type === "credit") {
      return acc + operation.amount;
    }

    return acc - operation.amount;
  }, 0);

  return balance;
}

app.post("/account", (req, resp) => {
  const { cpf, name } = req.body;

  const customerAlreadyExist = customers.some(customer => customer.cpf===cpf)
  if(customerAlreadyExist) { 
    return resp.status(400).json({ error: "Customer already exists!" });
  }

  const customer = {
    cpf,
    name,
    id: uuidv4(),
    statement: []
  };

  customers.push(customer);

  return resp.status(201).send();
});

// Quando eu quero que todas minhas rotas abaixo desse use, tenham esse middleware
//app.use(verifyIfExistAccountCPF);

// Ou posso utilizar entre os paramêtros ( especificando que é somente para essa rota )
app.get("/statement", verifyIfExistAccountCPF, (request, response) => {
  // Pegando o customer que está na request ( devido a ser adicionada no middleware )
  const { customer } = request;

  return response.json(customer.statement);
});

app.post("/deposit", verifyIfExistAccountCPF, (req, resp) => {
  const { description, amount } = req.body;
  
  // Pegando o customer do request que foi associado no middleware
  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit"
  };

  customer.statement.push(statementOperation);

  return resp.status(201).send();
});

app.post("/withdraw", verifyIfExistAccountCPF, (req, resp) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);
  if(balance < amount) {
    return resp.status(400).json({ error: "Insufficient funds" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit"
  }; 

  customer.statement.push(statementOperation);

  return resp.status(201).send();
});

app.get("/statement/date", verifyIfExistAccountCPF, (req, resp) => {
  const { customer } = req;
  const { date } = req.query;
  
  const dateFormat = new Date(date + " 00:00");
  
  const statement = customer.statement.filter(item => item.created_at.toDateString() === new Date(dateFormat).toDateString());

  return resp.json(statement);
});

app.put("/account", verifyIfExistAccountCPF, (req, resp) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;

  return resp.status(201).send();
});

app.get("/account", verifyIfExistAccountCPF, (req, resp) => {
  const { customer } = req;
  return resp.json(customer);
})

app.get("/accounts", (req, resp) => {
  return resp.json(customers);
})

app.delete("/account", verifyIfExistAccountCPF, (req, resp) => {
  const { customer } = req;
  customers.splice(customer, 1);
  return resp.status(200).json(customers);
})

app.listen(3333);

