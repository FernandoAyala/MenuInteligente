const { GoogleGenAI } = require('@google/genai');

const apiKey = 'AIzaSyAUF5pOaU_WlY31KvaedWo8hnCrw7CE1Qw';
const ai = new GoogleGenAI({ apiKey });

async function testGemini() {
  console.log('🧪 Probando Gemini con el nuevo SDK...\n');
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: "Di solo: Gemini funcionando correctamente",
    });
    
    console.log('✅ ¡Gemini funciona!\n');
    console.log('📝 Respuesta:', response.text);
    console.log('\n🎉 El provider está listo para usar!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGemini();
