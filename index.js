const {stdin, argv, cwd, chdir} = process;
const os = require('node:os');
const { createHash } = require('node:crypto');
const path = require('path');
const { readdir, writeFile, rename, unlink } = require('node:fs/promises');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream');
const zlib = require('zlib');

stdin.setEncoding('utf-8');
const failedMessage = 'Operation failed';

function isInvalidInput(data) {
  if(data.split(' ').length != 1){
    return true;
  }
}

function sortDataByName(a, b) {
  const nameA = a.name.toUpperCase();
  const nameB = b.name.toUpperCase();
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  return 0;
}

async function renameFileInManager(file, newName) {
  try {
    await rename(file, newName);
  } catch {
    console.log(failedMessage);
  }
}

async function writeFileInCwd(data) {
  try {
    const promise = await writeFile(data, '', "utf-8");
  }catch {
    console.error(failedMessage);
  }
}

async function copyFile(pathToFile, pathToCopy) {
  try {
    const content = createReadStream(pathToFile, "utf-8");
    content.on('error', err => console.log(err));
    const writeFile = createWriteStream(pathToCopy, "utf-8");
    writeFile.on('error', err => console.log(err));
    await pipeline(
      content,
      writeFile,
    )
  } catch {
    console.log(failedMessage);
  }
}

async function moveFile(pathToFile, pathToMove) {
  try {
    const content = createReadStream(pathToFile, "utf-8");
    content.on('error', err => console.log(err));
    const writeFile = createWriteStream(pathToMove, "utf-8");
    writeFile.on('error', err => console.log(err));
    await pipeline(
      content,
      writeFile
    );
    await unlink(pathToFile);
  } catch {
    console.log(failedMessage);
  }
}

async function removeFile(data) {
  try {
    await unlink(path.join(cwd(), data));
  } catch{
    console.log(failedMessage);
  }
}

async function readFileToConsole(data) {
  let rowData;
  try {
    const content = createReadStream(path.join(cwd(), data), 'utf-8');
    content.on("data", data => rowData += data);
    content.on("end", end => console.log(rowData));
  } catch {
    console.error(failedMessage);
  }
}

async function printFolderData() {
  const options = {
    encoding: 'utf-8',
    withFileTypes: true,
  };
  try {
    const files = await readdir(cwd(), options);
    const foldersData = files.filter(a => a.isDirectory()).sort((a, b) => sortDataByName(a, b))
    foldersData.forEach(file => file['type'] = 'folder');
    const filesData = files.filter(a => !a.isDirectory()).sort((a, b) => sortDataByName(a, b));
    filesData.forEach(file => file['type'] = 'file');
    const allData = foldersData.concat(filesData);
    console.table(allData)
  } catch  {
    console.error(failedMessage);
  }
}

async function compress(pathToFile) {
    try {
      const read = createReadStream(path.join(cwd(), pathToFile));
      read.on("error", err => console.log(failedMessage))
      const compress = createWriteStream(path.join(cwd(), `${pathToFile}.gz`));
      compress.on("error", err => console.log(failedMessage))
      await pipeline(
        createReadStream(path.join(cwd(), pathToFile)),
        zlib.createGzip(),
        createWriteStream(path.join(cwd(), `${pathToFile}.gz`)),
      )
    } catch {
      console.log(failedMessage);
    }
}

async function decompress(pathToFile) {
  try {
    const read = createReadStream(path.join(cwd(), pathToFile));
    read.on("error", err => console.log(failedMessage))
    const decompressName = pathToFile.split('.').slice(0, pathToFile.length - 2);
    const decompress = createWriteStream(path.join(cwd(), decompressName));
    decompress.on("error", err => console.log(failedMessage))
    await pipeline(
        read,
        zlib.createGzip(),
        compress
    )
  } catch {
    console.log(failedMessage);
  }
}

const validOperations = ['.exit', 'cat', 'add', 'up', 'cd', 'ls', 'rn', 'cp', 'mv',
  'rm', 'hash', 'compress', 'decompress', 'os'];

async function startFileManager (userName) {
  chdir(os.homedir());
    const greetingsMessage = `Welcome to the File Manager, ${userName}!`,
    byeMessage = `Thank you for using File Manager, ${userName}, goodbye!`,
    pathTemplate = 'You are currently in',
    wrongOperation = 'Invalid input';
  console.log(greetingsMessage);
  console.log(pathTemplate, cwd());

  stdin.on('data', data => {
    const command = data.trim().split(" ")[0];
    if(!validOperations.includes(command)) {
      console.log(wrongOperation);
    }

    if(command === 'up'){
      if(isInvalidInput(data)){
        console.log(wrongOperation);
      }else {
        chdir(path.join(cwd(), '../'));
      }
    }

    if(command === 'cd') {
      try {
        chdir(data.split(' ')[1].trim());
      } catch {
        console.error(failedMessage);
      }
    }

    if (command === 'rm') {
      if(data.split(' ').length === 2){
        removeFile(data.split(' ')[1].trim());
      }else {
        console.log(failedMessage);
      }
    }

    if(command === 'mv') {
      moveFile(data.split(' ')[1].trim(), data.split(' ')[2].trim());
    }

    if(command === 'ls') {
      if(isInvalidInput(data)){
        console.log(wrongOperation);
      }else {
        printFolderData();
      }
    }

    if(command === '.exit'){
      console.log(byeMessage);
      process.exit();
    }

    if(command === 'cat') {
      readFileToConsole(data.split(' ')[1].trim());
    }

    if(command === 'add') {
      const fileName = data.split(' ').slice(1).join(' ').trim();
      writeFileInCwd(fileName);
    }

    if (command === 'rn'){
      if(data.split(' ').length === 3){
        renameFileInManager(data.split(' ')[1], data.split(' ')[2].trim());
      }else {
        console.log(failedMessage);
      }
    }

    if(command === 'cp') {
      if(data.split(' ').length === 3){
        copyFile(data.split(' ')[1].trim(), data.split(' ')[2].trim());
      }else {
        console.log(failedMessage);
      }
    }

    if(command === 'os'){
      const operation = data.split(" ")[1].trim();
      switch (operation) {
        case '--cpus':
          console.log(os.cpus()[0].model);
          break
        case '--EOL':
          console.log(os.EOL);
          break
        case '--homedir':
          console.log(os.homedir());
          break
        case '--username':
          console.log(os.userInfo({encoding: 'utf-8'}).username);
          break
        case '--architecture':
          console.log(os.arch());
          break
        default:
          console.log(wrongOperation);
          break
      }
    }

    if(command === 'hash'){
      const hash = createHash('sha256');
      const dataToHash = data.split(' ').splice(1).join(' ').trim();
      hash.update(dataToHash);
      console.log(hash.digest('hex'));
    }
    if(command === 'compress') {
      compress(data.split(' ').splice(1).join(' ').trim());
    }
    if(command === 'decompress') {
      decompress(data.split(' ').splice(1).join(' ').trim());
    }
    console.log(pathTemplate, cwd());
  })
  process.on('SIGINT', () => {
    console.log('\n', byeMessage);
    process.exit();
  })
}

if(argv.length === 3 && argv[2].split('=')[0] === '--username' ){
  startFileManager(argv[2].split("=")[1]).then(r => {});
}else{
  console.log("If you need to start file manager, enter the command:" +
    " 'npm run start -- --username=your_username' to terminal");
}
