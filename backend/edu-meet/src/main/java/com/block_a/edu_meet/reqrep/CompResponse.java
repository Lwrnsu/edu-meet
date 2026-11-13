package com.block_a.edu_meet.reqrep;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CompResponse {
    private String output;
    private String error;
    private Object status;
    @JsonProperty("exit_code")
    private Object exitCode;
    private Object signal;
    private Object truncated;
    private Object time;
    private Object total;
    private Object memory;

    public CompResponse() {}

    public String getOutput() { 
        return output; 
    }
    public void setOutput(String output) {
        this.output = output;
    }

    public String getError() { 
        return error; 
    }
    public void setError(String error) { 
        this.error = error; 
    }

    public Object getStatus() { 
        return status; 
    }
    public void setStatus(Object status) { 
        this.status = status; 
    }

    public Object getExitCode() { 
        return exitCode; 
    }
    public void setExitCode(Object exitCode) { 
        this.exitCode = exitCode; 
    }

    public Object getSignal() { 
        return signal; 
    }
    public void setSignal(Object signal) { 
        this.signal = signal; 
    }

    public Object getTruncated() { 
        return truncated; 
    }
    public void setTruncated(Object truncated) { 
        this.truncated = truncated; 
    }

    public Object getTime() { 
        return time; 
    }
    public void setTime(Object time) { 
        this.time = time; 
    }

    public Object getTotal() { 
        return total; 
    }
    public void setTotal(Object total) { 
        this.total = total; 
    }

    public Object getMemory() { 
        return memory; 
    }
    public void setMemory(Object memory) { 
        this.memory = memory; 
    }
}