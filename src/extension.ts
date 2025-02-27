/**
 * VSCode多文件复制扩展的主入口文件.
 * 实现从资源管理器中复制多个文件内容到剪贴板的功能.
 */
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('多文件复制扩展已激活');

    let disposable = vscode.commands.registerCommand('multi-file-copy.copyFiles', async (...args: any[]) => {
        try {
            // 获取选中的文件
            let filesToCopy: vscode.Uri[] = [];
            
            // 处理命令参数
            if (args.length > 0) {
                // 如果第二个参数是数组，说明是多选
                if (Array.isArray(args[1])) {
                    filesToCopy = args[1];
                    console.log('从资源管理器获取到多个文件:', filesToCopy.length);
                }
                // 如果第一个参数是 Uri，说明是单选
                else if (args[0] instanceof vscode.Uri) {
                    filesToCopy = [args[0]];
                    console.log('获取到右键点击的文件:', args[0].fsPath);
                }
            }
            
            // 如果通过参数没有获取到文件，尝试从编辑器获取
            if (filesToCopy.length === 0 && vscode.window.activeTextEditor) {
                filesToCopy = [vscode.window.activeTextEditor.document.uri];
                console.log('从编辑器获取文件:', vscode.window.activeTextEditor.document.uri.fsPath);
            }

            // 如果没有获取到任何文件，尝试从资源管理器选择中获取
            if (filesToCopy.length === 0) {
                const selections = await vscode.window.showOpenDialog({
                    canSelectMany: true,
                    canSelectFolders: false,
                    canSelectFiles: true,
                    openLabel: '选择文件'
                });
                
                if (selections && selections.length > 0) {
                    filesToCopy = selections;
                    console.log('从对话框获取到文件:', selections.length);
                }
            }

            if (filesToCopy.length === 0) {
                vscode.window.showInformationMessage('请选择要复制的文件');
                return;
            }

            // 读取文件内容
            let allContent = '';
            let successCount = 0;

            for (const fileUri of filesToCopy) {
                try {
                    const document = await vscode.workspace.openTextDocument(fileUri);
                    allContent += `// ${fileUri.fsPath}\n${document.getText()}\n\n`;
                    successCount++;
                    console.log('成功读取文件:', fileUri.fsPath);
                } catch (err) {
                    console.error('读取文件失败:', fileUri.fsPath, err);
                    vscode.window.showWarningMessage(`无法读取文件: ${fileUri.fsPath}`);
                }
            }

            if (successCount > 0) {
                await vscode.env.clipboard.writeText(allContent);
                vscode.window.showInformationMessage(`已成功复制 ${successCount} 个文件的内容到剪贴板!`);
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

export function deactivate() {}