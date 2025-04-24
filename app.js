const languageMap = {
  python: { id: 71, mode: 'python' },
  java: { id: 62, mode: 'java' },
  c: { id: 50, mode: 'clike' },
  cpp: { id: 54, mode: 'clike' },
  r: { id: 80, mode: 'r' },
};

const sampleCodes = {
  python: 'print("Hello, World!")',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  c: '#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
  cpp: '#include <iostream>\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
  r: 'print("Hello, World!")\nlibrary(dplyr)\n\ninventory <- data.frame(\n  Item = c("Item4", "Item5", "Item1", "Item2", "Item6", "Item3"),\n  Qty = c(200, 500, 100, 50, 40, 30),\n  Unit_Price = c(25, 10, 20, 40, 50, 15)\n)\n\ninventory <- inventory %>%\n  mutate(Total_Value = Qty * Unit_Price) %>%\n  arrange(desc(Total_Value)) %>%\n  mutate(\n    Cumulative_Value = cumsum(Total_Value),\n    Cumulative_Perc = Cumulative_Value / sum(Total_Value) * 100\n  ) %>%\n  mutate(Category = case_when(\n    Cumulative_Perc <= 80 ~ "A",\n    Cumulative_Perc <= 95 ~ "B",\n    TRUE ~ "C"\n  ))\n\nprint(inventory)',
};

const editor = CodeMirror(document.getElementById('code-editor'), {
  value: sampleCodes.r,
  lineNumbers: true,
  mode: 'r',
  theme: 'dracula',
  lineWrapping: true,
  viewportMargin: Infinity,
});

let awaitingInput = false;
let currentToken = null;

document.getElementById('language').addEventListener('change', function() {
  const lang = this.value;
  editor.setOption('mode', languageMap[lang].mode);
  editor.setValue(sampleCodes[lang]);
});

document.getElementById('run').addEventListener('click', async function() {
  this.disabled = true;
  document.getElementById('rocket').classList.remove('hidden');
  document.getElementById('output').textContent = 'Output: Running...';
  document.getElementById('interactive-input').style.display = 'none';
  const lang = document.getElementById('language').value;
  const code = editor.getValue();
  const stdin = document.getElementById('stdin').value;

  try {
    const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': '0142d4a357msh15c6b0fbd87752ep186e33jsn3ea3cd2b7d56',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageMap[lang].id,
        stdin: stdin,
      }),
    });
    const data = await response.json();
    if (data.token) {
      currentToken = data.token;
      pollSubmission(currentToken);
    } else {
      document.getElementById('output').textContent = 'Error: Failed to get submission token';
      resetUI();
    }
  } catch (error) {
    document.getElementById('output').textContent = 'Error: ' + error.message;
    resetUI();
  }
});

function pollSubmission(token) {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
        headers: {
          'X-RapidAPI-Key': '0142d4a357msh15c6b0fbd87752ep186e33jsn3ea3cd2b7d56',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
      });
      const data = await response.json();
      if (data.status && data.status.id) {
        if (data.status.id >= 3) {
          clearInterval(interval);
          const outputText = data.stdout || data.stderr || data.compile_output || 'No output';
          if (outputText.includes('input') || outputText.includes('scanf') || outputText.includes('readline')) {
            document.getElementById('output').textContent = outputText + '\nAwaiting input...';
            document.getElementById('interactive-input').style.display = 'block';
            awaitingInput = true;
          } else {
            document.getElementById('output').textContent = outputText;
            resetUI();
          }
        }
      } else {
        clearInterval(interval);
        document.getElementById('output').textContent = 'Error: Invalid or missing status in API response';
        resetUI();
      }
    } catch (error) {
      clearInterval(interval);
      document.getElementById('output').textContent = 'Error: ' + error.message;
      resetUI();
    }
  }, 2000);
}

document.getElementById('interactive-input').addEventListener('keypress', async function(e) {
  if (e.key === 'Enter' && awaitingInput) {
    const additionalInput = this.value;
    this.value = '';
    this.style.display = 'none';
    awaitingInput = false;
    const lang = document.getElementById('language').value;
    const code = editor.getValue();
    const stdin = document.getElementById('stdin').value + '\n' + additionalInput;

    try {
      const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': '0142d4a357msh15c6b0fbd87752ep186e33jsn3ea3cd2b7d56',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageMap[lang].id,
          stdin: stdin,
        }),
      });
      const data = await response.json();
      if (data.token) {
        currentToken = data.token;
        pollSubmission(currentToken);
      } else {
        document.getElementById('output').textContent = 'Error: Failed to get submission token';
        resetUI();
      }
    } catch (error) {
      document.getElementById('output').textContent = 'Error: ' + error.message;
      resetUI();
    }
  }
});

document.getElementById('clear').addEventListener('click', function() {
  document.getElementById('output').textContent = 'Output:';
  document.getElementById('interactive-input').style.display = 'none';
  awaitingInput = false;
});

function resetUI() {
  document.getElementById('run').disabled = false;
  document.getElementById('rocket').classList.add('hidden');
}

editor.setOption('extraKeys', {
  'Ctrl-Enter': function() {
    document.getElementById('run').click();
  }
});

// Conditional Run Code Button Visibility
const percentage = 80; // Set to 80% as per your requirement
if (percentage === 80) {
  document.getElementById('run').classList.remove('hidden');
} else {
  document.getElementById('run').classList.add('hidden');
}
