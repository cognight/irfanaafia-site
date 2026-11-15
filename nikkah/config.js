// Shadi page (its address is /nikkah): event details and settings. This is the one place to change what the reply form shows.
// (The date line on the invitation picture itself is in index.html: look for class="when".)
window.SITE = {
  // The address of the Google script that stores RSVPs. Leave empty to preview with sample guests.
  apiUrl: "https://script.google.com/macros/s/AKfycbyXSqae16rSS_ZKvuMKq4abf167Y7DLk82A0rK61g81n2JDaiRGOLXYy25HRLfk_I58TA/exec",
  // Tells the script these replies are for the Shadi (the script and the planner call it "nikkah"), so they are kept apart from the Walima replies.
  eventKey: "nikkah",

  deadlineText: "Sunday, December 13, 2026",

  events: [
    {
      id: "nikkah",
      name: "Shadi",
      dateText: "Tuesday, January 5, 2027",
      timeText: "",   // for example "2:00 pm"
      venue: "Venue to be announced",
      address: "",
      mapsUrl: "",    // a Google Maps link; the map button appears once this is filled in
      // Calendar times in UTC, for example "20270109T190000Z". The calendar button appears once these are filled in.
      calendarTitle: "Irfan & Aafia's Shadi",
      startUTC: "",
      endUTC: "",
      icsFile: ""
    }
  ]
};
