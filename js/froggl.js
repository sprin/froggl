// A time tracking application by sprin.
// See the source on [github](https://github.com/sprin/froggl).

// Time entries with associated text are created when Start is 
// clicked, or when ENTER is pressed in the text box.
// The current duration is displayed next to the text.
// A time entry is ended when Stop is clicked. The end time is 
// recorded and used to compute the duration. Finished time 
// entries are displayed in a list. Both the currently runnning 
// time entry and the finished ones can be destroyed.

// Load application when DOM is ready.
$(document).ready( function() {

  // TimeEntry Model
  // ---------------
  //
  // **TimeEntry** model has `text`, `timeStart`, `timeEnd`, and 
  // `duration` attributes.
  window.TimeEntry = Backbone.Model.extend({

    // Start the **TimeEntry**.
    start: function() {
      this.set('timeStart', moment());
    },

    // End the **TimeEntry**.
    end: function() {
      this.set('timeEnd', moment());
      this.setDuration();
    },

    // Compute and set the `duration` as the difference between 
    // `end` and `start`.
    setDuration: function() {
      duration = this.get('timeEnd').diff(
        this.get('timeStart'), 'seconds');
      this.set('duration', duration);
    }

  });

  // Time Entry View
  // ---------------

  // The DOM element for a old **TimeEntry**.
  window.TimeEntryView = Backbone.View.extend({

    // Represent as a list tag.
    tagName: "li",

    // Cache the template for a single old **TimeEntry**.
    template: _.template($('#time-entry-template').html()),

    // DOM events for the old **TimeEntry**.
    events: {
      "click .old-time-entry-destroy": "clear"
    },

    // Bind functions to Backbone events
    initialize: function() {
      // Re-render **TimeEntryView** on change to model object.
      this.model.bind('change', this.render, this);
      // Remove the DOM element when model object is destroyed.
      this.model.bind('destroy', this.remove, this);
    },

    // Render the view.
    render: function() {
      console.log('entering TimeEntryView.render');
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
      console.log('AppView.initialize');
      this.destroyElement = this.$("#new-time-entry-destroy").hide();
      this.input = this.$("#new-time-entry-text");
      this.toggle = this.$("#new-time-entry-button");
      this.currentDuration = this.$('#new-time-entry-duration');
    },

    // Create a new time entry if ENTER is pressed in the text and 
    // if time is not already running.
    createOnEnter: function(e) {
      console.log('entering AppView.createOnEnter');
      if (e.keyCode === 13 && !(this.currentTimeEntry)) {
        this.create();
      }
    },

    // Create new **TimeEntry** model object if there is text.
    create: function() {
      console.log('entering AppView.create');
      var text = this.input.val();
      if (text) {
        this.currentTimeEntry = new TimeEntry({
          text: text,
        });
        this.currentTimeEntry.start();
        // Change the value of the toggle button to stop.
        this.toggle.val('Stop');
        // Show the destroy element.
        this.destroyElement.show();
        // Start the timer to update the duration element.
        this.timer = setInterval("App.updateDuration()",1000);
      }
    },

    // Toggl the start and stop of the time entry.
    toggleTime: function() {
      console.log('entering AppView.toggleTime');
      if (this.toggle.val() === 'Start') {
        this.create();
      } else {
        this.currentTimeEntry.end();
        this.addOne(this.currentTimeEntry);
        this.clear();
      }
    },

    // Add the time entry to the list of old entries.
    addOne: function(timeEntry) {
      var view = new TimeEntryView({model: timeEntry});
      $("#time-entry-list").prepend(view.render().el);
    },
    
    // Destroy the current time entry and reset UI elements.
    destroy: function() {
      this.destroyElement.hide();
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
      this.toggle.val('Start');
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