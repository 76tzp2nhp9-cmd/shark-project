  // HELPER: Calculate the 21st-20th Date Range
export const getPayrollRange = (monthStr) => {
  if(!monthStr) return { start: new Date(), end: new Date() };
  
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [mStr, yStr] = monthStr.split(' ');
  const monthIndex = months.indexOf(mStr);
  const year = parseInt(yStr);

  let startYear = year;
  let startMonth = monthIndex - 1;
  
  if (startMonth < 0) {
    startMonth = 11;
    startYear = year - 1;
  }

  // [FIX] Set hours to 12 (Noon) to avoid timezone shifts
  const startDate = new Date(startYear, startMonth, 21, 12, 0, 0); 
  const endDate = new Date(year, monthIndex, 20, 12, 0, 0);        
  
  return { 
    start: startDate, 
    end: endDate,
    includes: (dateStr) => {
      const d = new Date(dateStr);
      // Reset comparison date to noon as well to match range
      d.setHours(12, 0, 0, 0);
      return d >= startDate && d <= endDate;
    }
  };
};

// [FIXED] HELPER: Generate dates strictly based on Local Time
export const getDaysArray = (start, end) => {
  let arr = [];
  for(let dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
      // [FIX] Construct string manually YYYY-MM-DD using local time
      // This prevents .toISOString() from converting to UTC and shifting the day back
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      arr.push(`${year}-${month}-${day}`);
  }
  return arr;
};
  
  // Helper: Convert 24h time (18:21) to 12h format (6:21 PM) for display
 export const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes} ${ampm}`;
  };

export const getStandardMonthRange = (monthStr) => {
  if (!monthStr) return { start: new Date(), end: new Date() };
  const [monthName, year] = monthStr.split(' ');
  const date = new Date(`${monthName} 1, ${year}`);
  
  // Start is always the 1st of the selected month
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  
  // End is the last day of the same month
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0); 
  
  return { start, end };
};