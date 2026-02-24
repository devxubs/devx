const timers: any = {};
const delayExecute = (callback: Function, milliseconds = 400) => {
   const key = callback.toString() + milliseconds;
   if (timers[key]) clearTimeout(timers[key]);
   timers[key] = setTimeout(callback, milliseconds);
};

export default delayExecute;
