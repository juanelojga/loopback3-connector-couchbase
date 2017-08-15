# loopback3-connector-couchbase

The Couchbase Connector module compatible with Loopback 3.
This connector uses N1QL to perform queries.

### What is N1QL?
N1QL is a declarative query language that extends SQL for JSON. N1QL enables you to query JSON documents without any limitations - sort, filter, transform, group, and combine data with a single query.

### Getting Started
Before installing the connector module, make sure you've taken the appropriate steps to install and configure Couchbase Server and the N1QL Engine.

### Running N1QL
Before issuing queries against a Couchbase bucket, run the following command from the query command line to create a primary index on the bicket:

  CREATE PRIMARY INDEX ON `bucket-name` USING GSI;

## Connector settings

The connector can be configured using the following settings from the data source:
* host  (default to 'localhost'): The host name or ip address of the Couchbase server.
* port (default to 8091): The port number of the Couchbase server.
* bucket: The bucket name.
* password: The bucket password.

## Model definition for Couchbase Documents

**NOTE**: By default, all Couchbase documents will be created with a docType property which matches the model name. To set a Document Key yourself, simply pass in an id value in the data and the connector will use this id as the id property in the Document as well as for the Document Key itself.
