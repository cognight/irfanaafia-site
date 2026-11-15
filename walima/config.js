// Event details and settings. This is the one place to change the date, time or venue shown on the page.
// (If you change the time, also update walima.ics so the "Apple or Outlook" calendar file matches.)
window.SITE = {
  // The address of the Google script that stores RSVPs. Leave empty to preview with sample guests.
  apiUrl: "https://script.google.com/macros/s/AKfycbyXSqae16rSS_ZKvuMKq4abf167Y7DLk82A0rK61g81n2JDaiRGOLXYy25HRLfk_I58TA/exec",

  // Tells the script these replies are for the Walima.
  eventKey: "walima",

  deadlineText: "Sunday, December 13, 2026",

  // The other event, shown to families who are invited to both. If the Shadi date changes, change it here too.
  otherEvents: {
    nikkah: { name: "Shadi", shortDate: "Tue, Jan 5", path: "/shadi/", before: true }
  },

  events: [
    {
      id: "walima",
      name: "Walima",
      dateText: "Monday, January 11, 2027",
      shortDate: "Mon, Jan 11",
      heading: "Walima Ceremony",
      // the date as it is set out on the reply card (time: "" until it is known)
      dateParts: { weekday: "Mon", day: "11", month: "January", year: "2027", time: "at 7 pm" },
      timeText: "7:00 pm",
      venue: "Toronto Grand Convention Centre",
      address: "30 Baywood Rd, Etobicoke, ON M9V 2Z8",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Toronto%20Grand%20Convention%20Centre%2C%2030%20Baywood%20Rd%2C%20Etobicoke%2C%20ON%20M9V%202Z8",
      // Calendar times in UTC (7:00 pm Toronto time in January is 00:00 UTC the next day). End time is a 5 hour placeholder.
      calendarTitle: "Irfan & Aafia's Walima",
      startUTC: "20270112T000000Z",
      endUTC: "20270112T050000Z",
      icsFile: "walima.ics"
    }
  ]
};
