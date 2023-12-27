import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import './App.css';


function App() {
  const [file, setFile] = useState(null);
  const [csvData, setCSVData] = useState([]);
  const [editedData, setEditedData] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [editedColumnNames, setEditedColumnNames] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isEditingColumnName, setIsEditingColumnName] = useState(false);

  

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if (!file) {
      console.error('Nenhum arquivo selecionado.');
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      const data = event.target.result;

      if (file.name.endsWith('.csv')) {
        Papa.parse(data, {
          header: true,
          complete: (results) => {
            setCSVData(results.data);
            setEditedData(results.data);
            setHistory([results.data]);
            setCurrentHistoryIndex(0);
          },
          error: (error) => {
            console.error('Erro ao analisar o arquivo CSV:', error);
          },
        });
      } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        setCSVData(jsonData);
        setEditedData(jsonData);
        setHistory([jsonData]);
        setCurrentHistoryIndex(0);
      } else {
        console.error('Formato de arquivo não suportado.');
      }
    };

    reader.onerror = (error) => {
      console.error('Erro ao ler o arquivo:', error);
    };

    reader.readAsBinaryString(file);
  };

  const handleEdit = (rowIndex, columnName, newValue) => {
    const updatedData = editedData.map((row, index) => {
      if (index === rowIndex) {
        return {
          ...row,
          [columnName]: newValue,
        };
      }
      return row;
    });
    updateData(updatedData);
  };

  const updateData = (updatedData) => {
    if (currentHistoryIndex !== history.length - 1) {
      setHistory(history.slice(0, currentHistoryIndex + 1));
    }
    setEditedData(updatedData);
    setHistory([...history, updatedData]);
    setCurrentHistoryIndex(history.length);
  };

  const handleExport = () => {
    const csv = Papa.unparse(editedData);
    const csvData = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const csvURL = window.URL.createObjectURL(csvData);
    const tempLink = document.createElement('a');
    tempLink.href = csvURL;
    tempLink.setAttribute('download', 'edited_data.csv');
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
  };

  const handleAddColumn = () => {
    const updatedData = editedData.map((row) => ({
      ...row,
      [newColumnName]: '', 
    }));
    updateData(updatedData);
    setNewColumnName('');
  };

  const handleSaveColumnNames = () => {
    const updatedData = editedData.map((row) => {
      let updatedRow = { ...row };
      editedColumnNames.forEach(({ oldName, newName }) => {
        if (oldName !== newName) {
          updatedRow = Object.keys(updatedRow).reduce((acc, key) => {
            acc[newName === key ? oldName : key] = row[key];
            return acc;
          }, {});
        }
      });
      return updatedRow;
    });
    updateData(updatedData);
    setEditedColumnNames([]);
  };

  const handleColumnNameChange = (event, index) => {
    const columnName = event.target.value.trim();
    if (columnName === '') {
      return;
    }

    const oldColumnName = Object.keys(editedData[0])[index];
    const updatedData = editedData.map((row) => {
      const updatedRow = { ...row };
      if (oldColumnName !== columnName) {
        updatedRow[columnName] = updatedRow[oldColumnName];
        delete updatedRow[oldColumnName];
      }
      return updatedRow;
    });

    setEditedData(updatedData);
    setIsEditingColumnName(false);
  };

  const handleUndoRedo = (event) => {
    if (event.ctrlKey && event.shiftKey) {
      if (event.code === 'KeyZ') {
        event.preventDefault();
        handleUndo();
      } else if (event.code === 'KeyX') {
        event.preventDefault();
        handleRedo();
      }
    }
  };

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(currentHistoryIndex - 1);
      setEditedData(history[currentHistoryIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < history.length - 1) {
      setCurrentHistoryIndex(currentHistoryIndex + 1);
      setEditedData(history[currentHistoryIndex + 1]);
    }
  };

  const handleDeleteColumn = (columnName) => {
    const updatedData = editedData.map((row) => {
      const updatedRow = { ...row };
      delete updatedRow[columnName];
      return updatedRow;
    });
    updateData(updatedData);
  };

  const handleFilterChange = (columnName, value) => {
    setFilters({ ...filters, [columnName]: value });
  };

  const handleSort = (columnName) => {
    const direction = sortConfig.key === columnName && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    setSortConfig({ key: columnName, direction });
  };

  const filteredData = editedData.filter((row) => {
    return Object.entries(filters).every(([columnName, value]) => {
      if (value === '') {
        return true;
      }
      return row[columnName]?.toLowerCase().includes(value.toLowerCase());
    });
  });

  const sortedData = filteredData.slice().sort((a, b) => {
    if (sortConfig.key && a[sortConfig.key] && b[sortConfig.key]) {
      if (sortConfig.direction === 'ascending') {
        return a[sortConfig.key].localeCompare(b[sortConfig.key]);
      } else {
        return b[sortConfig.key].localeCompare(a[sortConfig.key]);
      }
    }
    return 0;
  });

  useEffect(() => {
    document.addEventListener('keydown', handleUndoRedo);
    return () => {
      document.removeEventListener('keydown', handleUndoRedo);
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Dashboard</h1>
        <input type="file" accept=".csv, application/vnd.ms-excel, text/plain" onChange={handleFileChange} />
        <button onClick={handleUpload}>Enviar CSV</button>
        <button onClick={handleExport}>Exportar CSV</button>

        <div>
          <input
            type="text"
            placeholder="Nome da nova coluna"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
          />
          <button onClick={handleAddColumn}>Adicionar Coluna</button>
        </div>

        {csvData.length > 0 &&
          Object.keys(csvData[0]).map((columnName, index) => (
            <div key={index}>
              <input
                type="text"
                value={columnName}
                onChange={(e) => handleColumnNameChange(e, index)}
              />
            </div>
          ))
        }

        <button onClick={handleSaveColumnNames}>Salvar Nomes das Colunas</button>

        <table>
          <thead>
            <tr>
              {Object.keys(editedData[0] || {}).map((columnName, index) => (
                <th key={index}>
                  {isEditingColumnName === columnName ? (
                    <input
                      type="text"
                      value={columnName}
                      onChange={(e) => handleColumnNameChange(e, index)}
                      onBlur={() => setIsEditingColumnName(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingColumnName(false);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span onClick={() => setIsEditingColumnName(columnName)}>
                        {columnName}
                      </span>
                      <button onClick={() => handleSort(columnName)}>
                        {sortConfig.key === columnName &&
                          (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓')}
                      </button>
                      <input
                        type="text"
                        value={filters[columnName] || ''}
                        onChange={(e) => handleFilterChange(columnName, e.target.value)}
                      />
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {Object.entries(row).map(([key, value]) => (
                  <td key={key}>
                    <input
                      type="text"
                      value={sortedData[rowIndex][key]}
                      onChange={(e) => handleEdit(rowIndex, key, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </header>
    </div>
  );
}





export default App;