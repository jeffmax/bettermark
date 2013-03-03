# list from http://norm.al/2009/04/14/list-of-english-stop-words/
STOP_WORDS = "a,able,about,across,after,all,almost,also,am,among,an,and,any,are,as,at,be,because,been,but,by,can,cannot,could,dear,did,do,does,either,else,ever,every,for,from,get,got,had,has,have,he,her,hers,him,his,how,however,i,if,in,into,is,it,its,just,least,let,like,likely,may,me,might,most,must,my,neither,no,nor,not,of,off,often,on,only,or,other,our,own,rather,said,say,says,she,should,since,so,some,than,that,the,their,them,then,there,these,they,this,tis,to,too,twas,us,wants,was,we,were,what,when,where,which,while,who,whom,why,will,with,would,yet,you,your".split(',')

class Classifier
    constructor: (@store) ->
        if @store?
            # Set internals from store
        else
           @feature_count = {}
           @klass_count = {}
        stop_words = STOP_WORDS.replace(/,/g, "\\b|\\b")
        stop_words = "\\b"+stop_words+"\\b"
        @stop_words = RegExp(stop_words, "ig")


     # Assumes document is a string
     get_features:(dokument) ->
         dokument = dokument.toLowerCase()
         # remove common words here
         dokument = dokument.replace(@stop_words, "")
         # remove punctuation
         dokument = dokument.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g," ")

         # TODO, might want to split on boundary

         features = dokument.split(" ")
         stemmed = (stemmer(feature) for feature in features)
         return stemmed

     train:(document, klass) ->
         # Update number of times this feature has been classified as klass
         features = @get_features(document)
         for feature in features
            record = @feature_count[feature] || {}
            record[klass] = if klass of record then record[klass]+1 else 1
            @feature_count[feature] = record
         # Update number of documents in this klass
         @klass_count[klass] = if klass of @klass_count then @klass_count[klass]+1 else 1

     # The probability a feature is in a particular class or category
     fc_probability:(feature, klass) ->
         if not klass of @klass_count
             return 0
         # What would dividing by the total occurrences of that feature give you?
         return @feature_count[feature][klass] / @klass_count[klass]


     weighted_probability:(feature, klass, ap = 0.5, ap_weight = 1.0) ->
         prob = @fc_probability(feature, klass)
         total_count = 0
         if feature of @feature_count and klass of @feature_count[feature]
             total_count =  @feature_count[feature][klass]
         #Note in PCI it said to use the total number of times this feature appears
         #in klass, but this did not make sense to me, it should be the number of times
         #the feature appeared in the klass for which we are trying to calculate a 
         #probability
         weighted = ((ap_weight * ap)+(total_count*prob))/(ap_weight+total_count)
         return weighted

