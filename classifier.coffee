class Classifier
    constructor: (@store) ->
        if @store?
            # Set internals from tore
        else
           @feature_count = {}
           @klass_count = {}

     train:(feature, klass) ->
         # Update number of times this feature has been classified as klass
         record  = @feature_count[feature] || {}
         record[klass] = if klass of record then record[klass]++ else 0
         @feature_count[feature]=record 
         # Update number of times this klass has been used
         @klass_count[klass] = if klass of @klass_count then @klass_count[klass]++ else 0





