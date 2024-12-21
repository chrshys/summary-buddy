export const getDefaultTitle = (date: Date): string => {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const hour = date.getHours();
  
  let timeOfDay;
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  return `A ${weekday} ${timeOfDay} recording`;
}; 