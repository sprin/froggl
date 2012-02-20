$(document).ready( function() {

  window.TimeEntry = Backbone.Model.extend({

    defaults: function() {
      return {
        text: ""
      };
    },

    start: function() {
      this.set('timeStart', moment());
    },

    end: function() {
      this.set('timeEnd', moment());
      this.setDuration();
    },

    setDuration: function() {
      duration = this.get('timeEnd').diff(
        this.get('timeStart'), 'seconds');
      this.set('duration', duration);
    }

  });

  window.TimeEntryView = Backbone.View.extend({

    tagName: "li",

    template: _.template($('#time-entry-template').html()),

    events: {
      "click .old-time-entry-destroy": "clear"
    },

    initialize: function() {
      this.model.bind('change', this.render, this);
      this.model.bind('destroy', this.remove, this);
    },

    render: function() {
      console.log('entering TimeEntryView.render');
      $(this.el).html(this.template(this.model.toJSON()));
      this.renderText();
      this.renderDuration();
      return this;
    },

    renderText: function() {
      var text = this.model.get('text');
      this.$('.time-entry-text').text(text);
    },

    renderDuration: function() {
      var duration = this.model.get('duration');
      var formattedDuration = formatDuration(duration);
      this.$('.time-entry-duration').text(formattedDuration);
    },

    remove: function() {
      $(this.el).remove();
    },

    clear: function() {
      this.model.destroy();
    }
  });

  window.AppView = Backbone.View.extend({
    el: $("#froggl-app"),

    events: {
      "keypress #new-time-entry-text": "createOnEnter",
      "click #new-time-entry-button": "toggleTime",
      "click #new-time-entry-destroy": "destroy"
    },

    initialize: function() {
      console.log('AppView.initialize');
      this.currentDestroyButton = this.$("#new-time-entry-destroy").hide();
      this.input = this.$("#new-time-entry-text");
      this.toggle = this.$("#new-time-entry-button");
      this.currentDuration = this.$('#new-time-entry-duration');
    },

    createOnEnter: function(e) {
      console.log('entering AppView.createOnEnter');
      if (e.keyCode === 13 && !(this.currentTimeEntry)) {
        this.create();
      }
    },

    create: function() {
      console.log('entering AppView.create');
      var text = this.input.val();
      if (text) {
        this.currentTimeEntry = new TimeEntry({
          text: text,
        });
        this.currentTimeEntry.start();
        this.toggle.val('Stop');
        this.currentDestroyButton.show();
        this.clock = setInterval("App.updateDuration()",1000);
      }
    },

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

    addOne: function(timeEntry) {
      var view = new TimeEntryView({model: timeEntry});
      $("#time-entry-list").prepend(view.render().el);
    },
    
    destroy: function() {
      this.currentDestroyButton.hide();
      if (this.currentTimeEntry) {
        this.currentTimeEntry.destroy();
      } else {
        console.log('attempt to destroy with no TimeEntry');
      }
      this.currentTimeEntry = null;
      this.clear();
    },

    clearClock: function() {
      if (this.clock) {
        clearInterval(this.clock);
      };
    },

    clear: function() {
      this.clearClock();
      this.input.val('');
      this.currentDuration.val('');
      this.toggle.val('Start');
      this.currentTimeEntry = null;
    },

    updateDuration: function() {
      this.currentDuration.val(formatDuration(
            moment().diff(
              this.currentTimeEntry.get('timeStart'),'seconds')));
    }

  });

  window.App = new AppView;

});

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

function padZero(number) {
  return (number < 10 ? '0' : '') + number;
}
