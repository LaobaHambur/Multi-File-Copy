import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 文件复制服务类.
 */
export class FileCopyService {
  
  /**
   * 复制选中的文件到目标目录.
   * @param files 选中的文件URI数组
   * @param targetDir 目标目录URI 
   */
  public async copyFiles(files: vscode.Uri[], targetDir: string): Promise<void> {
    if(!files || files.length === 0) {
      vscode.window.showErrorMessage('Please select files to copy!');
      return;
    }
    
    try {
      for(const file of files) {
        const fileName = path.basename(file.fsPath);
        const targetPath = path.join(targetDir, fileName);
        
        await fs.promises.copyFile(file.fsPath, targetPath);
      }
      
      vscode.window.showInformationMessage('Files copied successfully!');
      
    } catch (err) {
      // 修正类型错误
      const error = err as Error; 
      vscode.window.showErrorMessage(`Copy failed: ${error.message}`);
    }
  }
}