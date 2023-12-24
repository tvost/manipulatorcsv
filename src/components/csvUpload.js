import React from 'react';

const CSVUpload = () => {
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const response = await fetch('http://localhost:3001/upload-csv', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('Arquivo enviado com sucesso!');
      }
    } catch (error) {
      console.error('Ocorreu um erro:', error);
    }
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
    </div>
  );
};

export default CSVUpload;