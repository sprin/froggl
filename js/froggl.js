// A time tracking application by sprin.
// See the source on [github](https://github.com/sprin/froggl).

// Time entries with associated text are created when Start is 
// clicked, or when ENTER is pressed in the text box.
// The current duration is displayed next to the text.
// A time entry is ended when Stop is clicked. The end time is 
// recorded and used to compute the duration. Finished time 
// entries are displayed in a table. Finished time entries are 
// persisted using *localStorage*. Both the currently runnning 
// time entry and the finished ones can be destroyed.

// Load application when DOM is ready.
$(document).ready( function() {

  // TimeEntry Model
  // ---------------
  //
  // **TimeEntry** model has `text`, `timeStart`, `timeEnd`, and 
  // `duration` attributes.
  window.TimeEntry = Backbone.Model.extend({

    // Start the **TimeEntry** by instantiating a `moment` instance
    // with the current date and time and setting `timeStart` to 
    // the unix timestamp of the moment instace.
    start: function() {
      this.set('timeStart', moment().valueOf());
      this.save();
    },

    // End the **TimeEntry**.
    end: function() {
      // Set `timeEnd` silently, because we also need to set the duration.
      this.set({'timeEnd': moment().valueOf()}, {silent: true});
      this.setDuration();
      this.save();
    },

    // Compute and set the `duration` as the difference between 
    // `end` and `start`.
    setDuration: function() {
      // We re-instantiate a moment instance from the unix 
      // timestamp in `timeEnd`, but luckily, this is very fast.
      var momentEnd = moment(this.get('timeEnd'));
      var duration = momentEnd.diff(this.get('timeStart'), 'seconds');
      this.set('duration', duration);
    },

  });

  // TimeEntry Collection
  // --------------------

  // This collection is persisted in *localStorage*.
  window.TimeEntryList = Backbone.Collection.extend({

    //This collection's model:
    model: TimeEntry,

    // Save to the `"timeEntries"` namespace.
    localStorage: new Store("timeEntries"),

    // Get only done time entries, as in those with `timeEnd` set.
    done: function() {
      return this.filter(function(entry) {
        return entry.has('timeEnd') === true;
      });
    },

    // Get the currently running time entry, if one exists.
    getRunningEntry: function() {
      var last = this.last();
      if (last && !(last.has('timeEnd'))) {
        return last;
      }
    },

    // Time entries are sorted by their `start` moment.
    comparator: function(timeEntry) {
      return timeEntry.get('start');
    },

  });

  // Create the singleton `TimeEntryList`.
  window.TimeEntries = new TimeEntryList;

  // Time Entry View
  // ---------------

  // The DOM element for a old **TimeEntry**.
  window.TimeEntryView = Backbone.View.extend({

    // Represent as a list tag.
    tagName: "tr",

    // Cache the template for a single old **TimeEntry**.
    template: _.template($('#time-entry-template').html()),

    // DOM events for the old **TimeEntry**.
    events: {
      "click .old-time-entry-destroy": "clear"
    },

    // Bind functions to Backbone events
    initialize: function() {
      // Re-render **TimeEntryView** on change to model object.
      this.model.on('change', this.render, this);
      // Remove the DOM element when model object is destroyed.
      this.model.on('destroy', this.remove, this);
    },

    // Render the view.
    render: function() {
      // Get the template html.
      $(this.el).html(this.template(this.model.toJSON()));
      this.renderText();
      this.renderDuration();
      return this;
    },

    // Render the model `text`.
    renderText: function() {
      var text = this.model.get('text');
      this.$('.time-entry-text').text(text);
    },

    // Render the model `duration`.
    renderDuration: function() {
      var duration = this.model.get('duration');
      var formattedDuration = formatDuration(duration);
      this.$('.time-entry-duration').text(formattedDuration);
    },

    // Remove the DOM element.
    remove: function() {
      $(this.el).remove();
    },

    // Destroy the model object and remove the DOM element.
    clear: function() {
      this.model.destroy();
    }
  });

  // The Application View
  // --------------------

  // **AppView** is the top-level UI and manages the timer for new entries.
  window.AppView = Backbone.View.extend({
    // Bind to the application element already in the HTML.
    el: $("#froggl-app"),

    // Events for creating new time entries, starting and stopping, and 
    // clearing the new time entry if not wanted.
    events: {
      "keypress #new-time-entry-text": "createOnEnter",
      "click #new-time-entry-button": "toggleTime",
      "click #new-time-entry-destroy": "destroy"
    },

    // Make initial DOM changes and cache jQuery selections.
    initialize: function() {
      TimeEntries.on('reset', this.addAllEntries, this);

      TimeEntries.fetch();

      // Cache jQuery selections on **AppView**. 
      this.destroyIcon = this.$("#new-time-entry-destroy").hide();
      this.input = this.$("#new-time-entry-text");
      this.toggle = this.$("#new-time-entry-button");
      this.currentDuration = this.$('#new-time-entry-duration');
      
      // If a time entry was left open, bind it to the current time entry.
      this.currentTimeEntry = TimeEntries.getRunningEntry();
      if (this.currentTimeEntry) {
        // Set the value of the input - only necessary on page reload
        // if a time entry was left open.
        this.input.val(this.currentTimeEntry.get('text'));
        this.renderRunningEntry();
      }
    },

    // Create a new time entry if ENTER is pressed in the text and 
    // if time is not already running.
    createOnEnter: function(e) {
      if (e.keyCode === 13 && !(this.currentTimeEntry)) {
        this.create();
      }
    },

    // Create new **TimeEntry** model object if there is text.
    create: function() {
      var text = this.input.val();
      if (text) {
        this.currentTimeEntry = new TimeEntry({
          text: text,
        });
        TimeEntries.add(this.currentTimeEntry);
        this.currentTimeEntry.start();
        this.renderRunningEntry();
      }
    },

    // Set the UI state for a running current entry and start/resume
    // the timer.
    renderRunningEntry: function() {
      // Change the UI state of the toggle button to stop.
      this.setButton('stop');
      // Show the destroy icon.
      this.destroyIcon.show();
      // Set the initial duration value and start the timer to 
      // continue to update the duration element every second.
      this.updateDuration();
      this.timer = setInterval("App.updateDuration()",1000);
    },

    // Set the UI state of the button.
    setButton: function(state) {
      if (state === 'start') {
        this.toggle.text('Start');
        this.toggle.removeClass('btn-inverse');
        this.toggle.addClass('btn-success');

      } else if (state === 'stop') {
        this.toggle.text('Stop');
        this.toggle.removeClass('btn-success');
        this.toggle.addClass('btn-inverse');
      }
    },


    // Toggl the start and stop of the time entry.
    toggleTime: function() {
      if (this.toggle.text() === 'Start') {
        this.create();
      } else {
        this.stop();
      }
    },

    // Stop the current **TimeEntry** and render in the table.
    stop: function() {
      this.currentTimeEntry.end();
      this.addEntry(this.currentTimeEntry);
      this.clear();
    },

    // Add the time entry to the table of old entries.
    addEntry: function(timeEntry) {
      var view = new TimeEntryView({model: timeEntry});
      $("#time-entry-list").prepend(view.render().el);
    },

    // Add all done time entries in the collection to the table at once.
    addAllEntries: function() {
      _.each(TimeEntries.done(), this.addEntry);
    },
    
    // Destroy the current time entry and reset UI elements.
    destroy: function() {
      this.destroyIcon.hide();
      if (this.currentTimeEntry) {
        this.currentTimeEntry.destroy();
      } else {
        console.log('attempt to destroy with no TimeEntry');
      }
      this.currentTimeEntry = null;
      this.clear();
    },

    // Clear the timer.
    clearTimer: function() {
      if (this.timer) {
        clearInterval(this.timer);
      };
    },

    // Reset the new time entry UI elements and remove the reference
    // to the current **TimeEntry**.
    clear: function() {
      this.clearTimer();
      this.input.val('');
      this.currentDuration.val('');
      this.setButton('start');
      this.currentTimeEntry = null;
    },

    // Update the duration UI element.
    updateDuration: function() {
      this.currentDuration.val(formatDuration(
            moment().diff(
              this.currentTimeEntry.get('timeStart'),'seconds')));
    }

  });

  // Create the singleton **AppView**.
  window.App = new AppView;

});

// Format a duration in seconds to a pretty string.
function formatDuration(duration) {
  if (duration >= 3600) {
    return (Math.floor(duration/3600) + ":" + 
        padZero(Math.floor((duration % 3600)/60)) + ":" +
        padZero(Math.floor(duration % 60)));
  } else if (duration >= 60) {
    return (Math.floor(duration/60) + ":" + 
        padZero(duration % 60) + ' min');
  } else {
    return (duration + ' sec');
  }
}

// Pad a number with one zero if less than 10.
function padZero(number) {
  return (number < 10 ? '0' : '') + number;
}
