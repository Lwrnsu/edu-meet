package com.block_a.edu_meet.reqrep;

public class CompQuestions {
    private int id;
    private String question;
    private String error;

    public CompQuestions() {}

    //setter and getter for questionID
    public int getId() {
        return id;
    }
    public void setId(int id) {
        this.id = id;
    }
    //setter and getter for question
    public String getQuestion() {
        return question;
    }
    public void setQuestion(String question) {
        this.question = question;
    }
    //setter and getter for error
    public String getError() { 
        return error; 
    }
    public void setError(String error) { 
        this.error = error; 
    }
}
