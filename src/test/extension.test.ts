import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileCopyService } from '../fileCopy';

suite('FileCopy Test Suite', () => {
  
  test('Copy files successful', async () => {
    const service = new FileCopyService();
    
    // 创建测试文件和目录
    const sourceDir = path.join(__dirname, 'test-source');
    const targetDir = path.join(__dirname, 'test-target'); 
    
    if(!fs.existsSync(sourceDir)) {
      fs.mkdirSync(sourceDir);
    }
    if(!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir);
    }
    
    const testFile = path.join(sourceDir, 'test.txt');
    fs.writeFileSync(testFile, 'test content');
    
    // 执行复制
    await service.copyFiles([vscode.Uri.file(testFile)], targetDir);
    
    // 验证结果
    const copiedFile = path.join(targetDir, 'test.txt');
    assert.ok(fs.existsSync(copiedFile));
    
    // 清理
    fs.unlinkSync(testFile);
    fs.unlinkSync(copiedFile);
    fs.rmdirSync(sourceDir);
    fs.rmdirSync(targetDir);
  });
});