/**
 * VSCode多文件复制扩展的主入口文件.
 * 实现从资源管理器中复制多个文件内容到剪贴板的功能.
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('多文件复制扩展已激活');

    let disposable = vscode.commands.registerCommand('multi-file-copy.copyFiles', async (uri?: vscode.Uri, uris?: vscode.Uri[]) => {
        try {
            let filesToProcess: vscode.Uri[] = [];
            
            // 优先使用多选参数
            if (uris && uris.length > 0) {
                filesToProcess = uris;
                console.log('获取到多选项目:', uris.length);
            }
            // 单选情况
            else if (uri) {
                filesToProcess = [uri];
                console.log('获取到单个项目:', uri.fsPath);
            }
            // 如果没有参数，尝试从当前编辑器获取
            else if (vscode.window.activeTextEditor) {
                filesToProcess = [vscode.window.activeTextEditor.document.uri];
                console.log('从编辑器获取文件:', vscode.window.activeTextEditor.document.uri.fsPath);
            }
            // 最后尝试打开文件选择对话框
            else {
                const selections = await vscode.window.showOpenDialog({
                    canSelectMany: true,
                    canSelectFolders: true,
                    canSelectFiles: true,
                    openLabel: '选择文件或文件夹'
                });
                
                if (selections && selections.length > 0) {
                    filesToProcess = selections;
                    console.log('从对话框获取到项目:', selections.length);
                }
            }

            if (filesToProcess.length === 0) {
                vscode.window.showInformationMessage('请选择要复制的文件或文件夹');
                return;
            }

            // 收集所有需要处理的文件
            const allFiles: vscode.Uri[] = [];
            
            for (const item of filesToProcess) {
                const stat = await fs.promises.stat(item.fsPath);
                
                if (stat.isDirectory()) {
                    // 如果是文件夹，递归获取所有文件
                    const filesInDir = await getAllFilesInDirectory(item.fsPath);
                    allFiles.push(...filesInDir.map(f => vscode.Uri.file(f)));
                    console.log(`从文件夹 ${item.fsPath} 获取到 ${filesInDir.length} 个文件`);
                } else {
                    // 如果是文件，直接添加
                    allFiles.push(item);
                }
            }

            if (allFiles.length === 0) {
                vscode.window.showInformationMessage('没有找到可复制的文件');
                return;
            }

            // 读取文件内容
            let allContent = '';
            let successCount = 0;
            const errors: string[] = [];

            // 对文件进行排序，确保输出顺序一致
            allFiles.sort((a, b) => a.fsPath.localeCompare(b.fsPath));

            for (const fileUri of allFiles) {
                try {
                    // 检查文件大小，避免复制过大的文件
                    const stat = await fs.promises.stat(fileUri.fsPath);
                    if (stat.size > 10 * 1024 * 1024) { // 10MB
                        errors.push(`文件过大已跳过: ${fileUri.fsPath}`);
                        continue;
                    }

                    // 只处理文本文件
                    if (isTextFile(fileUri.fsPath)) {
                        const document = await vscode.workspace.openTextDocument(fileUri);
                        const relativePath = vscode.workspace.asRelativePath(fileUri);
                        allContent += `// ${relativePath}\n${document.getText()}\n\n`;
                        successCount++;
                        console.log('成功读取文件:', fileUri.fsPath);
                    } else {
                        console.log('跳过非文本文件:', fileUri.fsPath);
                    }
                } catch (err) {
                    console.error('读取文件失败:', fileUri.fsPath, err);
                    errors.push(`无法读取: ${fileUri.fsPath}`);
                }
            }

            if (successCount > 0) {
                await vscode.env.clipboard.writeText(allContent);
                let message = `已成功复制 ${successCount} 个文件的内容到剪贴板!`;
                
                if (errors.length > 0) {
                    message += ` (${errors.length} 个文件失败)`;
                    console.error('失败的文件:', errors);
                }
                
                vscode.window.showInformationMessage(message);
            } else {
                vscode.window.showErrorMessage('没有成功复制任何文件内容');
            }

        } catch (error) {
            console.error('复制文件时发生错误:', error);
            vscode.window.showErrorMessage('复制文件失败: ' + (error instanceof Error ? error.message : String(error)));
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * 递归获取目录下的所有文件
 */
async function getAllFilesInDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                // 跳过常见的需要忽略的目录
                const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.vscode', '.idea'];
                if (!ignoreDirs.includes(entry.name)) {
                    const subFiles = await getAllFilesInDirectory(fullPath);
                    files.push(...subFiles);
                }
            } else if (entry.isFile()) {
                files.push(fullPath);
            }
        }
    } catch (err) {
        console.error('读取目录失败:', dirPath, err);
    }
    
    return files;
}

/**
 * 判断是否为文本文件
 */
function isTextFile(filePath: string): boolean {
    const textExtensions = [
        // 编程语言
        '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
        '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.m',
        '.vue', '.dart', '.lua', '.perl', '.sh', '.bash', '.zsh', '.fish',
        
        // 标记语言和数据格式
        '.html', '.htm', '.xml', '.json', '.yaml', '.yml', '.toml', '.ini',
        '.csv', '.svg', '.md', '.markdown', '.rst', '.tex',
        
        // 样式表
        '.css', '.scss', '.sass', '.less', '.styl',
        
        // 配置文件
        '.env', '.config', '.conf', '.cfg', '.properties', '.gitignore',
        '.dockerignore', '.editorconfig', '.eslintrc', '.prettierrc',
        
        // 文本文件
        '.txt', '.log', '.sql', '.graphql', '.gql',
        
        // 其他
        'Makefile', 'Dockerfile', 'Jenkinsfile', 'Vagrantfile'
    ];
    
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);
    
    // 检查扩展名
    if (textExtensions.includes(ext)) {
        return true;
    }
    
    // 检查特殊文件名
    const specialFiles = ['Makefile', 'Dockerfile', 'Jenkinsfile', 'Vagrantfile', 'LICENSE', 'README'];
    if (specialFiles.includes(basename) || specialFiles.some(f => basename.startsWith(f))) {
        return true;
    }
    
    // 检查是否没有扩展名但是常见的文本文件
    if (!ext && (basename.startsWith('.') || specialFiles.includes(basename))) {
        return true;
    }
    
    return false;
}

export function deactivate() {}