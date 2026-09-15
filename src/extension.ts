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
            const skippedFiles: string[] = [];

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
                        skippedFiles.push(path.basename(fileUri.fsPath));
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
                
                if (skippedFiles.length > 0) {
                    message += ` (跳过 ${skippedFiles.length} 个非文本文件)`;
                    console.log('跳过的文件:', skippedFiles);
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
                const subFiles = await getAllFilesInDirectory(fullPath);
                files.push(...subFiles);
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
        // 主流编程语言
        '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
        '.py', '.pyw', '.py3', '.pyi',
        '.java', '.kt', '.kts', '.scala',
        '.c', '.cpp', '.cc', '.cxx', '.c++', '.h', '.hpp', '.hh', '.hxx', '.h++',
        '.cs', '.vb', '.fs', '.fsx',
        '.php', '.php3', '.php4', '.php5', '.phtml',
        '.rb', '.rbx', '.rhtml', '.erb',
        '.go', '.mod', '.sum',
        '.rs', '.toml',
        '.swift',
        '.dart',
        '.r', '.R', '.rmd', '.Rmd',
        '.m', '.mm',
        '.vue', '.svelte',
        '.lua',
        '.perl', '.pl', '.pm', '.t', '.pod',
        '.sh', '.bash', '.zsh', '.fish', '.ksh', '.csh', '.tcsh',
        '.ps1', '.psm1', '.psd1',
        '.bat', '.cmd',
        '.coffee', '.litcoffee',
        
        // 现代编程语言
        '.elm', '.ex', '.exs', '.erl', '.hrl', '.clj', '.cljs', '.cljc',
        '.jl', '.nim', '.cr', '.d', '.zig', '.v', '.odin',
        '.hs', '.lhs', '.ml', '.mli', '.fs', '.fsi', '.fsx',
        '.lisp', '.lsp', '.cl', '.scm', '.ss', '.rkt',
        '.f', '.f90', '.f95', '.f03', '.f08', '.for', '.ftn',
        '.pas', '.pp', '.inc',
        '.asm', '.s', '.S', '.nasm',
        '.prolog', '.pro', '.P','.csproj',
        
        // Web 相关
        '.html', '.htm', '.xhtml', '.shtml','.jsp',
        '.xml', '.xsl', '.xslt', '.xsd', '.wsdl', '.soap',
        '.xaml',
        '.css', '.scss', '.sass', '.less', '.styl', '.stylus',
        '.json', '.json5', '.jsonl', '.ndjson', '.geojson',
        '.yaml', '.yml',
        '.svg', '.svgz',
        
        // 模板引擎
        '.hbs', '.handlebars', '.mustache', '.ejs', '.pug', '.jade',
        '.twig', '.liquid', '.njk', '.nunjucks',
        
        // 数据格式
        '.csv', '.tsv', '.psv',
        '.ini', '.cfg', '.conf', '.config', '.properties',
        '.env', '.env.local', '.env.development', '.env.production',
        '.toml', '.lock',
        '.rdf', '.ttl', '.owl', '.jsonld',
        
        // 文档格式
        '.md', '.markdown', '.mdown', '.mkd', '.mkdn',
        '.rst', '.rest', '.restx', '.rtx',
        '.txt', '.text', '.asc',
        '.adoc', '.asciidoc',
        '.org',
        '.tex', '.latex', '.sty', '.cls', '.bib',
        '.pod', '.podspec',
        
        // 数据库
        '.sql', '.mysql', '.pgsql', '.sqlite', '.db',
        '.cypher', '.cql',
        
        // API 相关
        '.graphql', '.gql', '.graphqls',
        '.proto', '.protobuf',
        '.avro', '.avsc',
        '.thrift',
        '.raml', '.wadl',
        '.openapi', '.swagger',
        
        // 配置文件
        '.gitignore', '.gitattributes', '.gitmodules', '.gitkeep',
        '.dockerignore', '.editorconfig', '.eslintrc', '.prettierrc',
        '.babelrc', '.browserslistrc', '.stylelintrc', '.jshintrc',
        '.npmrc', '.yarnrc', '.nvmrc', '.noderc',
        '.htaccess', '.htpasswd',
        '.vimrc', '.zshrc', '.bashrc', '.profile',
        '.gemrc', '.rubocop.yml', '.rspec', '.pryrc',
        '.pylintrc', '.flake8', '.pycodestyle', '.isort.cfg',
        '.editorconfig', '.clang-format', '.clang-tidy',
        
        // 日志文件
        '.log', '.out', '.err', '.trace',
        
        // 其他
        '.license', '.licence', '.copyright',
        '.changelog', '.changes', '.history',
        '.todo', '.fixme', '.hack',
        '.spec', '.feature', '.gherkin',
        '.makefile', '.mk', '.cmake',
        '.dockerfile', '.containerfile',
        '.jenkinsfile', '.gitlab-ci.yml', '.travis.yml',
        '.appveyor.yml', '.circleci', '.github'
    ];
    
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);
    const basenameUpper = basename.toUpperCase();
    
    // 检查扩展名
    if (textExtensions.includes(ext)) {
        return true;
    }
    
    // 检查特殊文件名（不区分大小写）
    const specialFiles = [
        'Makefile', 'makefile', 'MAKEFILE',
        'Dockerfile', 'dockerfile', 'DOCKERFILE',
        'Containerfile', 'containerfile', 'CONTAINERFILE',
        'Jenkinsfile', 'jenkinsfile', 'JENKINSFILE',
        'Vagrantfile', 'vagrantfile', 'VAGRANTFILE',
        'Rakefile', 'rakefile', 'RAKEFILE',
        'Gemfile', 'gemfile', 'GEMFILE',
        'Podfile', 'podfile', 'PODFILE',
        'Pipfile', 'pipfile', 'PIPFILE',
        'Brewfile', 'brewfile', 'BREWFILE',
        'Procfile', 'procfile', 'PROCFILE',
        'LICENSE', 'LICENCE', 'COPYING', 'COPYRIGHT',
        'README', 'CHANGELOG', 'CHANGES', 'HISTORY',
        'TODO', 'FIXME', 'HACK', 'AUTHORS', 'CONTRIBUTORS',
        'INSTALL', 'NEWS', 'THANKS', 'VERSION',
        'CODEOWNERS', 'FUNDING.yml', 'SECURITY.md',
        'package.json', 'composer.json', 'setup.py', 'requirements.txt',
        'pyproject.toml', 'poetry.lock', 'Cargo.toml', 'Cargo.lock',
        'go.mod', 'go.sum', 'pubspec.yaml', 'pubspec.lock',
        'CMakeLists.txt', 'configure.ac', 'configure.in',
        'meson.build', 'BUILD', 'BUILD.bazel', 'WORKSPACE'
    ];
    
    // 检查完整文件名
    if (specialFiles.includes(basename) || specialFiles.includes(basenameUpper)) {
        return true;
    }
    
    // 检查文件名开头匹配
    const prefixMatches = [
        'README', 'LICENSE', 'LICENCE', 'CHANGELOG', 'CHANGES',
        'TODO', 'FIXME', 'AUTHORS', 'CONTRIBUTORS', 'COPYING',
        'INSTALL', 'NEWS', 'THANKS', 'VERSION', 'HISTORY'
    ];
    
    if (prefixMatches.some(prefix => 
        basenameUpper.startsWith(prefix.toUpperCase()) || 
        basename.startsWith(prefix)
    )) {
        return true;
    }
    
    // 检查是否没有扩展名但以点开头的配置文件
    if (!ext && basename.startsWith('.')) {
        return true;
    }
    
    // 检查常见的无扩展名可执行脚本
    const scriptFiles = ['configure', 'install', 'build', 'deploy', 'setup', 'test'];
    if (!ext && scriptFiles.includes(basename.toLowerCase())) {
        return true;
    }
    
    return false;
}

export function deactivate() {}