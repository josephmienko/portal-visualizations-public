/*
 * LISTENER
 *
 * Simple pub/sub class for notifying other modules of
 * data load events.
 */

// From http://davidwalsh.name/pubsub-javascript
//
// This module provides communication about events without
// creating dependencies between other modules.

var Events = (function(){
  var topics = {};
  var hOP = topics.hasOwnProperty;

  return {
    subscribe: function(topic, listener) {
      // If the topics object does not have a property corresponding to the
      // current topic, add it to topics along with an empty array
      if(!hOP.call(topics, topic)) {
        topics[topic] = [];
      }

      // Add the listener (the function to be executed when the topic is published)
      topics[topic].push(listener);
    },

    publish: function(topic, info) {
      // If the topic doesn't exist, or there are no listeners on the topic, exit
      if(!hOP.call(topics, topic)) return;

      // Cycle through topics object, firing the callback with the received info
      topics[topic].forEach(function(callback) {
          callback(info != undefined ? info : {});
      });
    }
  };
})();

module.exports = Events;