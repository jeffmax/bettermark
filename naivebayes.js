/*! coffee-classifier - v0.0.1 - 2013-04-28 */var Classifier, STOP_WORDS, stemmer;

stemmer = stemmer != null ? stemmer : function(x) {
    return x;
};

STOP_WORDS = "a,able,about,across,after,all,almost,also,am,among,an,and,any,are,as,at,be,because,been,but,by,can,cannot,could,dear,did,do,does,either,else,ever,every,for,from,get,got,had,has,have,he,her,hers,him,his,how,however,i,if,in,into,is,it,its,just,least,let,like,likely,may,me,might,most,must,my,neither,no,nor,not,of,off,often,on,only,or,other,our,own,rather,said,say,says,she,should,since,so,some,than,that,the,their,them,then,there,these,they,this,tis,to,too,twas,us,wants,was,we,were,what,when,where,which,while,who,whom,why,will,with,would,yet,you,your";

Classifier = function() {
    function Classifier(store) {
        var stop_words;
        if (store != null) {
            this.feature_count = store.feature_count;
            this.klass_count = store.klass_count;
        } else {
            this.feature_count = {};
            this.klass_count = {};
        }
        stop_words = STOP_WORDS.replace(/,/g, "\\b|\\b");
        stop_words = "\\b" + stop_words + "\\b";
        this.stop_words = RegExp(stop_words, "ig");
    }
    Classifier.prototype.to_object = function() {
        return {
            feature_count: this.feature_count,
            klass_count: this.klass_count
        };
    };
    Classifier.prototype.get_features = function(dokument) {
        var feature, features, key, unique, value, _i, _len, _results;
        dokument = dokument.toLowerCase();
        dokument = dokument.replace(this.stop_words, "");
        dokument = dokument.replace(/[><\.,-\/#!$%\^&\*;:{}=\-_`~()?]/g, " ");
        dokument = dokument.replace(/\[|\]/g, " ");
        dokument = dokument.replace(/\s+/g, " ");
        dokument = dokument.replace(/^\s*|\s*$/g, "");
        dokument = dokument.replace(/[`'‘’’"]/g, "");
        features = dokument.split(" ");
        unique = {};
        for (_i = 0, _len = features.length; _i < _len; _i++) {
            feature = features[_i];
            if (!/^\d+/.test(feature) && feature.length > 2) {
                unique[stemmer(feature)] = 1;
            }
        }
        _results = [];
        for (key in unique) {
            value = unique[key];
            _results.push(key);
        }
        return _results;
    };
    Classifier.prototype.train = function(dokument, klass) {
        var feature, features, record, _i, _len;
        features = this.get_features(dokument);
        for (_i = 0, _len = features.length; _i < _len; _i++) {
            feature = features[_i];
            record = this.feature_count[feature] || {};
            record[klass] = klass in record ? record[klass] + 1 : 1;
            this.feature_count[feature] = record;
        }
        if (features.length) {
            return this.klass_count[klass] = klass in this.klass_count ? this.klass_count[klass] + 1 : 1;
        }
    };
    Classifier.prototype.untrain = function(dokument, klass) {
        var feature, features, record, _i, _len;
        features = this.get_features(dokument);
        for (_i = 0, _len = features.length; _i < _len; _i++) {
            feature = features[_i];
            record = this.feature_count[feature];
            record[klass] -= 1;
        }
        if (features.length) {
            return this.klass_count[klass] -= 1;
        }
    };
    Classifier.prototype.rename_class = function(from, to) {
        var count, feature, record, _ref;
        _ref = this.feature_count;
        for (feature in _ref) {
            record = _ref[feature];
            if (record.hasOwnProperty(from)) {
                count = record[from];
                record[to] = record.hasOwnProperty(to) ? record[to] + count : count;
                delete record[from];
            }
        }
        count = this.klass_count[from];
        delete this.klass_count[from];
        return this.klass_count[to] = this.klass_count.hasOwnProperty(to) ? this.klass_count[to] + count : count;
    };
    Classifier.prototype.delete_class = function(klass) {
        var feature, record, _ref;
        _ref = this.feature_count;
        for (feature in _ref) {
            record = _ref[feature];
            if (record.hasOwnProperty(klass)) {
                delete record[klass];
            }
        }
        return delete this.klass_count[klass];
    };
    Classifier.prototype.documents_in_class_count = function(klass) {
        if (klass in this.klass_count) {
            return this.klass_count[klass];
        } else {
            return 0;
        }
    };
    Classifier.prototype.total_documents_count = function() {
        var count, klass, total, _ref;
        total = 0;
        _ref = this.klass_count;
        for (klass in _ref) {
            count = _ref[klass];
            total += count;
        }
        return total;
    };
    Classifier.prototype.feature_probability = function(feature, klass) {
        if (!klass in this.klass_count) {
            return 0;
        }
        if (feature in this.feature_count && klass in this.feature_count[feature]) {
            return this.feature_count[feature][klass] / this.klass_count[klass];
        }
        return 0;
    };
    Classifier.prototype.weighted_probability = function(feature, klass, ap, ap_weight) {
        var prob, total_count, weighted;
        if (ap == null) {
            ap = .5;
        }
        if (ap_weight == null) {
            ap_weight = 1;
        }
        prob = this.feature_probability(feature, klass);
        total_count = 0;
        if (feature in this.feature_count) {
            for (klass in this.feature_count[feature]) {
                total_count += this.feature_count[feature][klass];
            }
        }
        weighted = (ap_weight * ap + total_count * prob) / (ap_weight + total_count);
        return weighted;
    };
    return Classifier;
}();

var NaiveBayesClassifier, __hasProp = {}.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) {
        if (__hasProp.call(parent, key)) child[key] = parent[key];
    }
    function ctor() {
        this.constructor = child;
    }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.__super__ = parent.prototype;
    return child;
};

NaiveBayesClassifier = function(_super) {
    __extends(NaiveBayesClassifier, _super);
    function NaiveBayesClassifier(store, threshold, _default) {
        if (threshold == null) {
            threshold = 1e-6;
        }
        this["default"] = _default != null ? _default : "Uncategorized";
        NaiveBayesClassifier.__super__.constructor.call(this, store);
        this.threshold = Math.log(threshold);
    }
    NaiveBayesClassifier.prototype.prob_document_given_category = function(dokument, klass, features) {
        var feature, prob, _i, _len;
        features = features != null ? features : this.get_features(dokument);
        prob = 0;
        for (_i = 0, _len = features.length; _i < _len; _i++) {
            feature = features[_i];
            prob += Math.log(this.weighted_probability(feature, klass));
        }
        return prob;
    };
    NaiveBayesClassifier.prototype.prob_category_given_document = function(dokument, klass, features) {
        var category_prob, doc_prob;
        category_prob = Math.log(this.documents_in_class_count(klass) / this.total_documents_count());
        doc_prob = this.prob_document_given_category(dokument, klass, features);
        return doc_prob + category_prob;
    };
    NaiveBayesClassifier.prototype.classify = function(dokument) {
        var best_klass, best_score, features, klass, log_threshold, probabilities;
        features = this.get_features(dokument);
        if (!features.length) {
            return this["default"];
        }
        log_threshold = Math.log(this.threshold);
        probabilities = {};
        best_score = this.threshold;
        for (klass in this.klass_count) {
            probabilities[klass] = this.prob_category_given_document(dokument, klass, features);
            if (probabilities[klass] > best_score) {
                best_score = probabilities[klass];
                best_klass = klass;
            }
        }
        if (best_score > this.threshold) {
            return best_klass;
        } else {
            return this["default"];
        }
    };
    return NaiveBayesClassifier;
}(Classifier);