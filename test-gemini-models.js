const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyAUF5pOaU_WlY31KvaedWo8hnCrw7CE1Qw';

async function testGeminiAPI() {
  console.log('🔍 Verificando API Key de Gemini...\n');
  console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}\n`);
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Lista de modelos a probar (más completa)
  const modelsToTest = [
    'models/gemini-pro',
    'models/gemini-1.5-pro-latest',
    'models/gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    'gemini-pro'
  ];
  
  console.log('🧪 Probando modelos de Gemini:\n');
  
  for (const modelName of modelsToTest) {
    try {
      process.stdout.write(`Probando: ${modelName.padEnd(35)}... `);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Responde solo: OK');
      const response = await result.response;
      const text = response.text();
      console.log(`✅ FUNCIONA - Respuesta: "${text.trim()}"`);
      console.log(`\n🎉 ¡Encontrado! Usa este modelo: "${modelName}"\n`);
      return modelName;
    } catch (error) {
      console.log(`❌ ${error.message.split('\n')[0]}`);
    }
  }
  
  console.log('\n⚠️  Ningún modelo funcionó. Posibles razones:');
  console.log('   1. La API key no es válida o está expirada');
  console.log('   2. La API key no tiene permisos para usar Gemini');
  console.log('   3. Necesitas habilitar la API en Google Cloud Console');
  console.log('\n📝 Verifica tu API key en: https://aistudio.google.com/app/apikey');
}

testGeminiAPI();
