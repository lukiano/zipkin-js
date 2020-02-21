const fastJson = require('fast-json-stringify');

let fastJsonStringifyGlobal;

const v2Model = {
  title: 'V2 Span Model',
  $ref: '#/definitions/Span',
  definitions: {
    Endpoint: {
      type: 'object',
      title: 'Endpoint',
      description: 'The network context of a node in the service graph',
      properties: {
        serviceName: {
          type: 'string',
          description: 'Lower-case label of this node in the service graph, such as "favstar". Leave\nabsent if unknown.\n\nThis is a primary label for trace lookup and aggregation, so it should be\nintuitive and consistent. Many use a name from service discovery.\n'
        },
        ipv4: {
          type: 'string',
          format: 'ipv4',
          description: 'The text representation of the primary IPv4 address associated with this\nconnection. Ex. 192.168.99.100 Absent if unknown.\n'
        },
        ipv6: {
          type: 'string',
          format: 'ipv6',
          description: 'The text representation of the primary IPv6 address associated with a\nconnection. Ex. 2001:db8::c001 Absent if unknown.\n\nPrefer using the ipv4 field for mapped addresses.\n'
        },
        port: {
          type: 'integer',
          description: 'Depending on context, this could be a listen port or the client-side of a\nsocket. Absent if unknown. Please don\'t set to zero.\n'
        }
      }
    },
    Annotation: {
      title: 'Annotation',
      type: 'object',
      description: 'Associates an event that explains latency with a timestamp.\nUnlike log statements, annotations are often codes. Ex. "ws" for WireSend\n\nZipkin v1 core annotations such as "cs" and "sr" have been replaced with\nSpan.Kind, which interprets timestamp and duration.\n',
      required: [
        'timestamp',
        'value'
      ],
      properties: {
        timestamp: {
          type: 'integer',
          description: 'Epoch **microseconds** of this event.\n\nFor example, 1502787600000000 corresponds to 2017-08-15 09:00 UTC\n\nThis value should be set directly by instrumentation, using the most precise\nvalue possible. For example, gettimeofday or multiplying epoch millis by 1000.\n'
        },
        value: {
          type: 'string',
          description: 'Usually a short tag indicating an event, like "error"\n\nWhile possible to add larger data, such as garbage collection details, low\ncardinality event names both keep the size of spans down and also are easy\nto search against.\n'
        }
      }
    },
    Tags: {
      type: 'object',
      title: 'Tags',
      description: 'Adds context to a span, for search, viewing and analysis.\n\nFor example, a key "your_app.version" would let you lookup traces by version.\nA tag "sql.query" isn\'t searchable, but it can help in debugging when viewing\na trace.\n',
      additionalProperties: {
        type: 'string'
      }
    },
    ListOfSpans: {
      title: 'ListOfSpans',
      description: 'A list of spans with possibly different trace ids, in no particular order',
      type: 'array',
      items: {
        $ref: '#/definitions/Span'
      }
    },
    Trace: {
      title: 'Trace',
      type: 'array',
      description: 'List of spans who have the same trace ID.',
      items: {
        $ref: '#/definitions/Span'
      }
    },
    ListOfTraces: {
      title: 'ListOfTraces',
      type: 'array',
      items: {
        $ref: '#/definitions/Trace'
      }
    },
    Span: {
      title: 'Span',
      description: 'A span is a single-host view of an operation. A trace is a series of spans\n(often RPC calls) which nest to form a latency tree. Spans are in the same\ntrace when they share the same trace ID. The parent_id field establishes the\nposition of one span in the tree.\n\nThe root span is where parent_id is Absent and usually has the longest\nduration in the trace. However, nested asynchronous work can materialize as\nchild spans whose duration exceed the root span.\n\nSpans usually represent remote activity such as RPC calls, or messaging\nproducers and consumers. However, they can also represent in-process\nactivity in any position of the trace. For example, a root span could\nrepresent a server receiving an initial client request. A root span could\nalso represent a scheduled job that has no remote context.\n',
      type: 'object',
      required: [
        'traceId',
        'id'
      ],
      properties: {
        traceId: {
          type: 'string',
          maxLength: 32,
          minLength: 16,
          pattern: '[a-f0-9]{16,32}',
          description: 'Randomly generated, unique identifier for a trace, set on all spans within it.\n\nEncoded as 16 or 32 lowercase hex characters corresponding to 64 or 128 bits.\nFor example, a 128bit trace ID looks like 4e441824ec2b6a44ffdc9bb9a6453df3\n'
        },
        name: {
          type: 'string',
          description: 'The logical operation this span represents in lowercase (e.g. rpc method).\nLeave absent if unknown.\n\nAs these are lookup labels, take care to ensure names are low cardinality.\nFor example, do not embed variables into the name.\n'
        },
        parentId: {
          type: 'string',
          pattern: '[a-f0-9]{16}',
          maxLength: 16,
          minLength: 16,
          description: 'The parent span ID or absent if this the root span in a trace.'
        },
        id: {
          type: 'string',
          pattern: '[a-f0-9]{16}',
          maxLength: 16,
          minLength: 16,
          description: 'Unique 64bit identifier for this operation within the trace.\n\nEncoded as 16 lowercase hex characters. For example ffdc9bb9a6453df3\n'
        },
        kind: {
          type: 'string',
          enum: [
            'CLIENT',
            'SERVER',
            'PRODUCER',
            'CONSUMER'
          ],
          description: 'When present, kind clarifies timestamp, duration and remoteEndpoint. When\nabsent, the span is local or incomplete. Unlike client and server, there\nis no direct critical path latency relationship between producer and\nconsumer spans.\n\n* `CLIENT`\n  * timestamp is the moment a request was sent to the server. (in v1 "cs")\n  * duration is the delay until a response or an error was received. (in v1 "cr"-"cs")\n  * remoteEndpoint is the server. (in v1 "sa")\n* `SERVER`\n  * timestamp is the moment a client request was received. (in v1 "sr")\n  * duration is the delay until a response was sent or an error. (in v1 "ss"-"sr")\n  * remoteEndpoint is the client. (in v1 "ca")\n* `PRODUCER`\n  * timestamp is the moment a message was sent to a destination. (in v1  "ms")\n  * duration is the delay sending the message, such as batching.\n  * remoteEndpoint is the broker.\n* `CONSUMER`\n  * timestamp is the moment a message was received from an origin. (in v1 "mr")\n  * duration is the delay consuming the message, such as from backlog.\n  * remoteEndpoint - Represents the broker. Leave serviceName absent if unknown.\n'
        },
        timestamp: {
          type: 'integer',
          format: 'int64',
          description: 'Epoch microseconds of the start of this span, possibly absent if\nincomplete.\n\nFor example, 1502787600000000 corresponds to 2017-08-15 09:00 UTC\n\nThis value should be set directly by instrumentation, using the most\nprecise value possible. For example, gettimeofday or multiplying epoch\nmillis by 1000.\n\nThere are three known edge-cases where this could be reported absent.\n * A span was allocated but never started (ex not yet received a timestamp)\n * The span\'s start event was lost\n * Data about a completed span (ex tags) were sent after the fact\n'
        },
        duration: {
          type: 'integer',
          format: 'int64',
          minimum: 1,
          description: 'Duration in **microseconds** of the critical path, if known. Durations of less\nthan one are rounded up. Duration of children can be longer than their\nparents due to asynchronous operations.\n\nFor example 150 milliseconds is 150000 microseconds.\n'
        },
        debug: {
          type: 'boolean',
          description: 'True is a request to store this span even if it overrides sampling policy.\n\nThis is true when the `X-B3-Flags` header has a value of 1.\n'
        },
        shared: {
          type: 'boolean',
          description: 'True if we are contributing to a span started by another tracer (ex on a different host).'
        },
        localEndpoint: {
          $ref: '#/definitions/Endpoint',
          description: 'The host that recorded this span, primarily for query by service name.\n\nInstrumentation should always record this. Usually, absent implies late\ndata. The IP address corresponding to this is usually the site local or\nadvertised service address. When present, the port indicates the listen\nport.\n'
        },
        remoteEndpoint: {
          $ref: '#/definitions/Endpoint',
          description: 'When an RPC (or messaging) span, indicates the other side of the\nconnection.\n\nBy recording the remote endpoint, your trace will contain network context\neven if the peer is not tracing. For example, you can record the IP from\nthe `X-Forwarded-For` header or the service name and socket of a remote\npeer.\n'
        },
        annotations: {
          type: 'array',
          uniqueItems: true,
          items: {
            $ref: '#/definitions/Annotation'
          },
          description: 'Associates events that explain latency with the time they happened.'
        },
        tags: {
          $ref: '#/definitions/Tags',
          description: 'Tags give your span context for search, viewing and analysis.'
        }
      },
      example: {
        id: '352bff9a74ca9ad2',
        traceId: '5af7183fb1d4cf5f',
        parentId: '6b221d5bc9e6496c',
        name: 'get /api',
        timestamp: 1556604172355737,
        duration: 1431,
        kind: 'SERVER',
        localEndpoint: {
          serviceName: 'backend',
          ipv4: '192.168.99.1',
          port: 3306
        },
        remoteEndpoint: {
          ipv4: '172.19.0.2',
          port: 58648
        },
        tags: {
          'http.method': 'GET',
          'http.path': '/api'
        }
      }
    },
    DependencyLink: {
      title: 'DependencyLink',
      description: 'The count of traced calls between services, or between a service and a broker.\n\nThe direction of the link is parent to child, and can be one of:\n * client to server\n * producer to broker\n * broker to consumer\n\nNote: This is related to span ID count between a sender and receiver, but there\nis nuance that makes it more difficult than counting unique span IDs. Ex. the\nparent or child might be uninstrumented: detected via the remote endpoint. There\ncan also be scenarios where both sides are instrumented. Please use existing tools\nsuch as zipkin-dependencies to derive links as they avoid under or over counting.\n',
      type: 'object',
      required: [
        'parent',
        'child',
        'callCount'
      ],
      properties: {
        parent: {
          type: 'string',
          description: 'The service name of the caller: client or message producer or broker.'
        },
        child: {
          type: 'string',
          description: 'The service name of the callee: server or message consumer or broker.'
        },
        callCount: {
          type: 'integer',
          description: 'Total traced calls made from the parent to the child.'
        },
        errorCount: {
          type: 'integer',
          description: 'Total traced calls made from the parent to the child known to be in error.'
        }
      }
    }
  }
};

function loadFastJsonStringify() {
  // /* eslint-disable global-require */
  fastJsonStringifyGlobal = fastJson(v2Model);
}

function fastJsonStringify(object) {
  if (!fastJsonStringifyGlobal) {
    loadFastJsonStringify();
  }
  return fastJsonStringifyGlobal(object);
}

module.exports = fastJsonStringify;
