import { app } from 'electron';
import fs from 'fs-extra';
import path from 'path';
export type AppPath = Parameters<typeof app.getPath>[0];

// 根据本地的slidev-temp目录，将其生成对应的数据
export const slidevTempFiles = async () => {
  const slidevTempPath = app.isPackaged ? path.join(process.resourcesPath, 'slidev-temp') : path.join(__dirname, '../../slidev-temp');
  const targetObj = {};
  const lockNames = ['yarn.lock', 'package-lock.json', 'pnpm-lock.yaml']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traverse = (dir: string, obj: any) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file === 'node_modules' || lockNames.includes(file)) return;
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        obj[file] = { directory: {} };
        traverse(filePath, obj[file].directory);
      } else {
        obj[file] = {
          file: {
            contents: new Uint8Array(fs.readFileSync(filePath))
          }
        };
      }
    });
  }
  traverse(slidevTempPath, targetObj);
  return targetObj;
}

export interface UserFileOptions {
  /**
   * 文件名称 - 包含后缀
   */
  fileName?: string;
  /**
   * 文件内容 - 字符串
   */
  content?: string | NodeJS.ArrayBufferView;
  /**
   * 文件目录 默认为userData，可选值：appData、userData、temp、desktop、documents、downloads、music、pictures、videos
   */
  appDir?: AppPath;
  /**
   * 目录名称 - 默认自定义为user-files
   */
  dirName?: string;
  /**
   * 是否追加写入
   */
  append?: boolean;

  sourcePath?: string;

  filePath?: string;
}

export const getUserFileDir = (opt: UserFileOptions) => {
  const { appDir, dirName } = opt;
  const dirPath = path.join(app.getPath(appDir || 'userData'), (dirName || 'user-files'));
  return dirPath
}
// 存储
export const writeTempFile = async (option: UserFileOptions) => {
  const TEMP_DIR = getUserFileDir(option)
  const { fileName, content, append } = option;
  if (!fs.existsSync(TEMP_DIR)) {
    await fs.mkdir(TEMP_DIR);
  }
  const filePath = path.join(TEMP_DIR, fileName);
  if (append) {
    await fs.appendFile(filePath, content as string | Uint8Array);
    return
  }
  await fs.writeFile(filePath, content);
}

// 读取
export const readTempFile = async (option: UserFileOptions) => {
  const TEMP_DIR = getUserFileDir(option)
  const { fileName } = option;
  const filePath = path.join(TEMP_DIR, fileName);
  if (fs.existsSync(filePath)) {
    // 判断文件是否是二进制文件 - 通过后缀判断
    const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff', '.tif', '.svg'].includes(path.extname(fileName).toLowerCase());
    if (isBinary) {
      return fs.readFileSync(filePath)
    }
    return fs.readFile(filePath, 'utf-8');
  }
  return ''
}

// 读取JSON目录内容
async function readAllJsonFiles() {
  try {
    const JSON_DIR = getUserFileDir({
      dirName: 'json'
    })
    // 判断目录是否存在
    if (!fs.existsSync(JSON_DIR)) {
      return [];
    }

    const files = await fs.readdir(JSON_DIR);
    // 过滤出所有的 .json 文件
    const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');

    // 读取并解析所有的 .json 文件
    const jsonContents = await Promise.all(jsonFiles.map(async (file) => {
      const filePath = path.join(JSON_DIR, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    }));

    return jsonContents;
  } catch (error) {
    console.error('Error reading JSON files:', error);
    throw error;
  }
}

export const mkdir = async (option: UserFileOptions) => {
  const TEMP_DIR = getUserFileDir({
    dirName: '/'
  })
  const dirPath = path.join(TEMP_DIR, option.dirName);
  if (!fs.existsSync(dirPath)) {
    await fs.mkdir(dirPath);
  }
}

export const copy = async (option: UserFileOptions) => {
  const { filePath, sourcePath } = option;
  if (fs.existsSync(sourcePath)) {
    await fs.copyFile(sourcePath, filePath);
  }
}

// 删除
export const deleteTempFile = async (option: UserFileOptions) => {
  const TEMP_DIR = getUserFileDir(option)
  const { fileName } = option;
  const filePath = path.join(TEMP_DIR, fileName);
  if (fs.existsSync(filePath)) {
    await fs.unlink(filePath);
  }
}

// 清空
export const clearTempFiles = async (option: UserFileOptions) => {
  const TEMP_DIR = getUserFileDir(option)
  if (fs.existsSync(TEMP_DIR)) {
    await fs.remove(TEMP_DIR);
  }
}

// 集合
export const useUserFiles = {
  write: writeTempFile,
  read: readTempFile,
  delete: deleteTempFile,
  clear: clearTempFiles,
  readAllJsonFiles,
  getUserFileDir,
  mkdir,
  copy,
};

export type UserFilesActions = keyof typeof useUserFiles;
export type UserFileResponse = ReturnType<typeof useUserFiles[UserFilesActions]>;
