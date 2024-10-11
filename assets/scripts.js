const defaultCode = `package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}`;

require.config({
    paths: {
        'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs',
        'monaco-vim': 'https://cdn.jsdelivr.net/npm/monaco-vim@0.4.1/dist/monaco-vim',
    }
});
require(['vs/editor/editor.main', 'monaco-vim'], function (_, MonacoVim) {
    var editor = monaco.editor.create(document.getElementById('container'), {
        value: defaultCode,
        language: 'go',
        theme: 'vs-dark'
    });
    var statusNode = document.getElementById('status');
    var vimMode;
    var isVimModeEnabled = localStorage.getItem('viMode') === 'true'; // Retrieve Vim mode state from localStorage
    // var isVimModeEnabled = true;
    var vimNoteElement = document.getElementById('vim-note');
    var shareUrlContainer = document.getElementById('share-url-container');
    var shareUrlElement = document.getElementById('share-url');
    var shareUrlTooltip = document.getElementById('share-url-tooltip');

    function initVimMode() {
        vimMode = MonacoVim.initVimMode(editor, statusNode);

        // Define custom ex command for :w to run the code
        MonacoVim.VimMode.Vim.defineEx('w', '', function () {
            executeGoCode();
        });

        // Show the Vim note
        vimNoteElement.style.display = 'block';
        // Update the vim button text
        document.getElementById('toggle-vim-btn').textContent = 'Disable Vim Mode';
    }

    function disableVimMode() {
        if (vimMode) {
            vimMode.dispose();
        }

        // Hide the Vim note
        vimNoteElement.style.display = 'none';
    }

    if (isVimModeEnabled) {
        initVimMode();
    }

    editor.onDidChangeModelContent(() => {
        shareUrlContainer.style.display = 'none';
    });

    document.getElementById('toggle-vim-btn').addEventListener('click', function () {
        if (isVimModeEnabled) {
            disableVimMode();
            this.textContent = 'Enable Vim Mode';
        } else {
            initVimMode();
            this.textContent = 'Disable Vim Mode';
        }
        isVimModeEnabled = !isVimModeEnabled;
        localStorage.setItem('viMode', isVimModeEnabled); // Store Vim mode state in localStorage
    });

    document.getElementById('run-btn').addEventListener('click', executeGoCode);

    document.getElementById('reset-btn').addEventListener('click', function () {
        editor.setValue(defaultCode);
        document.getElementById('result-container').style.display = 'none';
        shareUrlContainer.style.display = 'none';
    });

    document.getElementById('share-btn').addEventListener('click', shareGoCode);

    shareUrlElement.addEventListener('click', function () {
        this.select();
        navigator.clipboard.writeText(this.value).then(() => {
            shareUrlTooltip.style.display = 'block';
            setTimeout(() => {
                shareUrlTooltip.style.display = 'none';
            }, 2000);
        });
    });

    async function executeGoCode() {
        const resultContainer = document.getElementById('result-container');
        const resultElement = document.getElementById('result');
        resultContainer.style.display = 'block';
        resultElement.textContent = '$ go run main.go\nCompiling...';
        const goCode = editor.getValue();

        const result = await runGoCode(goCode);

        if (result.Errors) {
            resultElement.textContent = `$ go run main.go\nError: ${result.Errors}`;
        } else {
            resultElement.textContent = `$ go run main.go\n${result.Events.map(event => event.Message).join('\n')}`;
        }
    }

    async function runGoCode(code) {
        const response = await fetch('http://localhost:8080/compile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'learn.gopherguides.com/1.0'
            },
            body: JSON.stringify({
                version: 2,
                body: code
            })
        });
        return await response.json();
    }

    async function shareGoCode() {
        const goCode = editor.getValue();
        try {
            const response = await fetch('http://localhost:8080/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                    'User-Agent': 'learn.gopherguides.com/1.0'
                },
                body: goCode
            });
            const result = await response.json();
            shareUrlElement.value = result.shareURL;
            shareUrlContainer.style.display = 'block';
        } catch (error) {
            console.error('Error sharing code:', error);
            shareUrlElement.value = 'Error sharing code. Please try again.';
            shareUrlContainer.style.display = 'block';
        }
    }
});
