$(document).ready(function() {
  var mbtaURL = "http://developer.mbta.com/lib/gtrtfs/Departures.csv";
  //var mbtaURL = "Departures-test.csv";
  var mbtaSchedule; //array holding the converted CSV
  var weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  //Kick it all off
  init();

  //get data from the URL and put it in an array
  //for testing/debugging offline: don't worry about cross-site perms
  /*
  function getSchedule(mbta){
    var msg = $.ajax({type: "GET", url: mbta, async: false}).responseText;
    console.log(msg);
    var schedule = $.csv.toArrays(msg);
    return schedule;
  }
  */
  
  //get data from the URL and put it in an array
  //uses a proxy server
  function getSchedule(mbta){
    // Handle form submit.
    var proxy = 'proxy.php';
    var url = proxy + '?url=' + encodeURIComponent(mbta);
    // Make JSON request.
    console.log("making JSON request at "+url);
    var response; 
    var schedule;
    response = $.ajax({
      dataType: "json",
      url: url,
      async: false
    }).responseText;
    //this could be a single line but is more readable as 3
    schedule = $.parseJSON('[' + response + ']');
    schedule = schedule[0].contents;
    schedule = $.csv.toArrays(schedule);
    return schedule;
  }

  //given the schedule, convert every epoch to a date
  //epoch date columns are predefined in dataspec as column 0 and column 4
  //skips header row
  function epochsToDates(schedule){
    var datedSchedule = schedule;
    for(var i = 1; i< datedSchedule.length; i++){
      for(var j = 0; j < datedSchedule[0].length; j++){
        if(j == 0 || j == 4){
          datedSchedule[i][j] = epochToDate(datedSchedule[i][j]);
        }
      }
    }
    return datedSchedule;
  }

  //given an epoch time, return a human readable date
  function epochToDate(epoch){
    if(!isNaN(epoch)){//check that we're given a number
      var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
      d.setUTCSeconds(epoch);
      var fd =""; //formatted date
      var minutes = d.getMinutes();
      var hours = d.getHours();
      if(hours < 10)
        hours = "0"+hours;
      if(minutes < 10)
        minutes = "0"+minutes; 
      fd += weekday[d.getDay()] + " ";
      fd += months[d.getMonth()] + " ";
      fd += d.getDate() + " "
      fd += hours+":"+minutes;
      return fd;
    }
    else
      console.log("cannot convert this value");
  }

  //returns the current time as Day Month Date HH:MM 24-hour time
  function getCurrentTime(){
    var d = new Date();
    var fd ="";
    var hours = d.getHours();
    var minutes = d.getMinutes();
    if(hours < 10)
      hours = "0"+hours;
    if(minutes < 10)
      minutes = "0"+minutes;
    fd = weekday[d.getDay()] + " " + months[d.getMonth()] + " " + d.getDate() + " " + hours+":"+minutes;
    return fd;
  }

  //given a schedule, insert that information into the page as HTML
  function insertTrainInfo(schedule){
    var cellData;
    var cell;
    var delayTime = 0;

    //insert the time the schedule was made
    $("#retrievalTime").text(getCurrentTime());

    //insert each train schedule
    for(var i = 1; i< schedule.length; i++){
      for(var j = 0; j < schedule[0].length; j++){
        var extraClasses ="";//store extra classes
        cellData=schedule[i][j];

        if(j==5 && cellData > 0){ //if we have a delay, store the delay amount to add it to status
          delayTime = cellData;
        }
        
        if(j==1){ //special case for first cell in row
          extraClasses +=" firstCell ";
        }
        else if(j == 6 && cellData ===""){ //write "TBD" if no track is defined
          cellData = "TBD";
        }
        else if(j==7){ //special case for last cell in row 
          extraClasses += getStatusColor(cellData) + " lastCell ";
          //Generating delay time message
          if(delayTime > 0){
            var delaySize = 0;
            magnitude =["second", "minute", "or more hour"];
            while(delayTime > 60 && delaySize < 3){
              delaySize++;
              delayTime/=60;
            }
            cellData+= ", " + Math.round(delayTime) + " " + magnitude[delaySize] + "  delay";
          }
        }

        if(j!=0 && j !=5){//don't append columns 0 and 5
          cell = "<div class='Rtable-cell "+extraClasses+" '>"+cellData+"</div>";
          $(".Rtable").append(cell);
        }
      }
      delayTime = 0; //clear delayTime from previous row
    }
  }

  //determine what class to add for coloring the status
  function getStatusColor(status){
    switch(status) {
        case "On Time":
            return  "OnTime";
            break;
        case "Cancelled":
            return "Cancelled";
            break;
        case "Arriving":
            return "Arriving";
            break;
        case "End":
            return "End";
            break;
        case "Now Boarding":
            return "NowBoarding";
            break;
        case "Info to follow":
            return "Infotofollow";
            break;
        case "Arrived":
            return "Arrived";
            break;
        case "All Aboard":
            return "AllAboard";
            break;
        case "TBD":
            return "TBD";
            break;
        case "Departed":
            return "Departed";
            break;
        case "Delayed":
            return "Delayed";
            break;
        case "Late":
            return "Late";
            break;
        case "Hold":
            return "Hold";
            break;        
        default:
            return  "other";
            break;
    }
  }

  //bind all buttons
  function bindButtons(){
    //search button scrolls to first instance of searched location
    $("#search").bind( "click", function() {
      var destination = $("#destination").val();
      if (destination == ""){
        alert("Please enter a destination.");
        return;
      }
      //scrolls to the first cell of the row containing the destination element
      var scrollTo = $(".Rtable-cell:containsNC("+destination+")" ).first().prevAll(".firstCell").first();
      if(!scrollTo[0]){
        alert("Destination not found");
      }
      scrollTo.scrollView();
    });

    //bind the enter key to the textbox
    $("#destination").keyup(function(event){
        if(event.keyCode == 13){
            $("#search").click();
        }
    });
  }

  //containsNC selector for case-insensitive contains
  $.extend($.expr[":"], {
    "containsNC": function(elem, i, match, array) {
      return (elem.textContent || elem.innerText || "").toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
    }
  });

  //scroll to the searched location 
  //usage: $("#selector").scrollTo();
  $.fn.scrollView = function () {
    return this.each(function () {
        $('html, body').animate({
            scrollTop: $(this).offset().top
        }, 500);
    });
  }

  //initial code to run once
  function init(){
    bindButtons();
    main();
    setInterval(main, 300000);
  }

  //What code to run on repeat
  function main(){
    //clear the old schedule
    $(".headerCell").last().nextAll().remove();

    mbtaSchedule = getSchedule(mbtaURL);
    mbtaSchedule = epochsToDates(mbtaSchedule);
    insertTrainInfo(mbtaSchedule);
    console.log("got new schedule");
    console.log(mbtaSchedule);
  }

});
