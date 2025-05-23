import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

suite('Multi File Copy Test Suite', () => {
  
  const testDir = path.join(__dirname, 'test-workspace');
  
  // 在每个测试前创建测试环境
  setup(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });
  
  // 在每个测试后清理测试环境
  teardown(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  test('复制单个文件', async () => {
    // 创建测试文件
    const testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'test content');
    
    // 执行命令
    await vscode.commands.executeCommand('multi-file-copy.copyFiles', vscode.Uri.file(testFile));
    
    // 验证剪贴板内容
    const clipboardContent = await vscode.env.clipboard.readText();
    assert.ok(clipboardContent.includes('test content'));
    assert.ok(clipboardContent.includes('test.txt'));
  });
  
  test('复制多个文件', async () => {
    // 创建多个测试文件
    const file1 = path.join(testDir, 'file1.js');
    const file2 = path.join(testDir, 'file2.ts');
    fs.writeFileSync(file1, 'console.log("file1");');
    fs.writeFileSync(file2, 'console.log("file2");');
    
    // 执行命令
    const uris = [vscode.Uri.file(file1), vscode.Uri.file(file2)];
    await vscode.commands.executeCommand('multi-file-copy.copyFiles', uris[0], uris);
    
    // 验证剪贴板内容
    const clipboardContent = await vscode.env.clipboard.readText();
    assert.ok(clipboardContent.includes('console.log("file1");'));
    assert.ok(clipboardContent.includes('console.log("file2");'));
    assert.ok(clipboardContent.includes('file1.js'));
    assert.ok(clipboardContent.includes('file2.ts'));
  });
  
  test('复制文件夹内容', async () => {
    // 创建文件夹结构
    const subDir = path.join(testDir, 'src');
    fs.mkdirSync(subDir);
    
    const file1 = path.join(subDir, 'index.js');
    const file2 = path.join(subDir, 'utils.js');
    fs.writeFileSync(file1, 'export default function() {}');
    fs.writeFileSync(file2, 'export const util = () => {}');
    
    // 执行命令
    await vscode.commands.executeCommand('multi-file-copy.copyFiles', vscode.Uri.file(subDir));
    
    // 验证剪贴板内容
    const clipboardContent = await vscode.env.clipboard.readText();
    assert.ok(clipboardContent.includes('export default function() {}'));
    assert.ok(clipboardContent.includes('export const util = () => {}'));
  });
  
  test('递归复制嵌套文件夹', async () => {
    // 创建嵌套文件夹结构
    const srcDir = path.join(testDir, 'src');
    const componentsDir = path.join(srcDir, 'components');
    fs.mkdirSync(componentsDir, { recursive: true });
    
    const file1 = path.join(srcDir, 'app.js');
    const file2 = path.join(componentsDir, 'button.js');
    fs.writeFileSync(file1, 'const app = "app";');
    fs.writeFileSync(file2, 'const button = "button";');
    
    // 执行命令
    await vscode.commands.executeCommand('multi-file-copy.copyFiles', vscode.Uri.file(testDir));
    
    // 验证剪贴板内容
    const clipboardContent = await vscode.env.clipboard.readText();
    assert.ok(clipboardContent.includes('const app = "app";'));
    assert.ok(clipboardContent.includes('const button = "button";'));
  });
  
  test('忽略 node_modules 和 .git 目录', async () => {
    // 创建包含忽略目录的结构
    const srcFile = path.join(testDir, 'index.js');
    const nodeModulesDir = path.join(testDir, 'node_modules');
    const nodeModulesFile = path.join(nodeModulesDir, 'package.js');
    
    fs.writeFileSync(srcFile, 'main content');
    fs.mkdirSync(nodeModulesDir);
    fs.writeFileSync(nodeModulesFile, 'should be ignored');
    
    // 执行命令
    await vscode.commands.executeCommand('multi-file-copy.copyFiles', vscode.Uri.file(testDir));
    
    // 验证剪贴板内容
    const clipboardContent = await vscode.env.clipboard.readText();
    assert.ok(clipboardContent.includes('main content'));
    assert.ok(!clipboardContent.includes('should be ignored'));
  });
  
  test('跳过非文本文件', async () => {
    // 创建混合文件类型
    const textFile = path.join(testDir, 'code.js');
    const binaryFile = path.join(testDir, 'image.png');
    
    fs.writeFileSync(textFile, 'console.log("text");');
    // 创建一个假的二进制文件
    fs.writeFileSync(binaryFile, Buffer.from([0x89, 0x50, 0x4E, 0x47]));
    
    // 执行命令
    const uris = [vscode.Uri.file(textFile), vscode.Uri.file(binaryFile)];
    await vscode.commands.executeCommand('multi-file-copy.copyFiles', uris[0], uris);
    
    // 验证剪贴板内容
    const clipboardContent = await vscode.env.clipboard.readText();
    assert.ok(clipboardContent.includes('console.log("text");'));
    assert.ok(!clipboardContent.includes('PNG')); // 不应包含二进制内容
  });
});