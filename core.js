const fs = require("fs");

const path = require("path");

const axios = require("axios");

const currentDirectory = process.cwd();

const configs = fs.readFileSync(
  path.join(currentDirectory, "./api-mapper.json"),
  "utf-8",
  (err) => {
    if (err) {
      throw new Error("Arquivo de configuração não encontrado");
    }
  }
);

const interfaceTemplate = "interface";

const archiveDefaultMessage = `/*
  Arquivo gerado dinamicamente pela ferramenta. Pode apresentar erros, pois ainda está em desenvolvimento.
  Ass: Luis Fernando =)
*/\n\n`;

let rootInterfaceData = `${archiveDefaultMessage}`;

const mapperConfigs = JSON.parse(configs);

const httpClient = axios.create({
  baseURL: mapperConfigs.host,
  headers: { Authorization: `Bearer ${mapperConfigs.accessToken}` },
});

const configFolder = path.join(currentDirectory, mapperConfigs.dist);

const hasConfigFolder = fs.existsSync(configFolder);

function interfaceNameFormatter(interfaceName) {
  const firstLetter = interfaceName[0].toUpperCase();
  return `I${firstLetter}${interfaceName.slice(1)}`;
}

function sameType(data) {
  const result = data.every((item) => typeof item === typeof data[0]);
  return result;
}

function objectFilter(arr) {
  const keyFound = new Set();
  const distinctObjects = [];
  const simpleObjects = [];
  for (let i = 0; i < arr.length; i++) {
    const obj = arr[i];
    const typeOfObj = typeof obj;
    const objectFilterLiterals = {
      true: () => {
        if (!keyFound.has(typeOfObj)) {
          keyFound.add(typeOfObj);
          simpleObjects.push(typeOfObj);
        }
      },
      false: () => {
        const keyOrder = Object.keys(obj).sort().join(",");
        if (!keyFound.has(keyOrder)) {
          distinctObjects.push(obj);
          keyFound.add(keyOrder);
        }
      },
    };
    objectFilterLiterals[!["object"].includes(typeOfObj)]();
  }

  return [...simpleObjects, ...distinctObjects];
}

function typeDistinct(key, value) {
  let distinctCounty = 0;
  const objectFilter_ = objectFilter(value);
  const results = objectFilter_.map((item) => {
    if (typeof item != "object") {
      return item;
    }
    distinctCounty++;
    const name = dataType(item, `${key}${distinctCounty}`);
    return name;
  });
  let typeContent = results.map((item) => `${item}`).join(" | ");
  let unionType = `(${typeContent})[]`;
  return unionType;
}

function keyType(key, value) {
  const keyTypeLiterals = {
    string: () => typeof value,
    number: () => typeof value,
    object: () => {
      const typeOfArray = value.length;
      if (typeOfArray) {
        const sameType_ = sameType(value);
        if (!sameType_) {
          return typeDistinct(key, value);
        }
        return `${typeof value[0]} []`;
      }
      return dataType(value, key);
    },
  };
  return keyTypeLiterals[typeof value]();
}

function interfaceContent(data) {
  let content = ``;
  data.forEach((item) => {
    const [key, value] = item;
    const type = keyType(key, value);
    content += `
    ${key}:${type}
    `;
  });
  return content;
}

function interfaceFactory(interface, content) {
  const interfaceNameFormatter_ = interfaceNameFormatter(interface);
  let dataInterface = `${interfaceTemplate} ${interfaceNameFormatter_} {
    ${content}
  }`;
  rootInterfaceData += `${dataInterface}\n\n`;
  return interfaceNameFormatter_;
}

function dataType(data, interface) {
  const dataEntries = Object.entries(data);
  const content = interfaceContent(dataEntries);
  return interfaceFactory(interface, content);
}

function writeInterfaces(data, interface) {
  dataType(data, interface);
  fs.writeFile(`${configFolder}/${interface}.ts`, rootInterfaceData, (err) => {
    if (err) throw err;
    console.log("Interfaces geradas com sucesso");
  });
}

async function makeRequests(endpoint) {
  const response = await httpClient.get(endpoint);
  const { data } = response;
  writeInterfaces(data, endpoint);
}

function bootstrap() {
  for (let i = 0; i < mapperConfigs.endpoints.length; i++) {
    const endpoint = mapperConfigs.endpoints[i];
    makeRequests(endpoint);
  }
}

if (!hasConfigFolder) {
  fs.mkdir(mapperConfigs.dist, bootstrap);
}

if (hasConfigFolder) {
  bootstrap();
}
