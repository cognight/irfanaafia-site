// Event details and settings. This is the one place to change the date, time or venue shown on the page.
// (If you change the time, also update walima.ics so the "Apple or Outlook" calendar file matches.)
window.SITE = {
  // The address of the Google script that stores RSVPs. Leave empty to preview with sample guests.
  apiUrl: "",

  deadlineText: "Sunday, December 13, 2026",

  events: [
    {
      id: "walima",
      name: "Walima",
      dateText: "Monday, January 11, 2027",
      timeText: "6:00 pm",
      venue: "Toronto Grand Convention Centre",
      address: "30 Baywood Rd, Etobicoke, ON M9V 2Z8",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Toronto%20Grand%20Convention%20Centre%2C%2030%20Baywood%20Rd%2C%20Etobicoke%2C%20ON%20M9V%202Z8",
      // Calendar times in UTC (6:00 pm Toronto time in January is 23:00 UTC). End time is a 5 hour placeholder.
      calendarTitle: "Irfan & Aafia's Walima",
      startUTC: "20270111T230000Z",
      endUTC: "20270112T040000Z",
      icsFile: "walima.ics"
    }
  ]
};
