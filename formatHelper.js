// Open formatHelper.js and replace its content with this:
export const formatPlantInfo = (rawInfo) => {
  const sections = rawInfo.split('\n');
  let formattedMessage = "🌿 *Plant Identification Results*\n\n";
  
  sections.forEach(section => {
    if (section.includes(':')) {
      const [title, content] = section.split(':');
      formattedMessage += `*${title.trim()}:*\n${content.trim()}\n\n`;
    }
  });
  
  return formattedMessage;
};

export const formatDiseaseInfo = (rawInfo) => {
  const sections = rawInfo.split('\n');
  let formattedMessage = "🔬 *Plant Disease Analysis*\n\n";
  
  sections.forEach(section => {
    if (section.includes(':')) {
      const [title, content] = section.split(':');
      formattedMessage += `*${title.trim()}:*\n${content.trim()}\n\n`;
    }
  });
  
  return formattedMessage;
};
