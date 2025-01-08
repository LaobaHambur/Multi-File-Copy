import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('多文件复制扩展已激活!');

    let disposable = vscode.commands.registerCommand('multi-file-copy.copyFiles', async () => {
        try {
            // 获取选中的文件
            const uris = vscode.window.activeTextEditor ? 
                        [vscode.window.activeTextEditor.document.uri] :
                        [];
            
            if (!uris.length) {
                vscode.window.showInformationMessage('请选择要复制的文件');
                return;
            }

            // 获取文件内容
            let allContent = '';
            for (const uri of uris) {
                const document = await vscode.workspace.openTextDocument(uri);
                allContent += `// ${uri.fsPath}\n${document.getText()}\n\n`;
            }

            // 复制到剪贴板
            await vscode.env.clipboard.writeText(allContent);
            
            vscode.window.showInformationMessage('文件内容已复制到剪贴板!');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`复制失败: ${errorMessage}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}