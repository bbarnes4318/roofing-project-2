import React, { createContext, useContext, useState, useEffect } from 'react';
import { ACTIVITY_FEED_SUBJECTS } from '../data/constants';

const SubjectsContext = createContext();

export const useSubjects = () => {
  const context = useContext(SubjectsContext);
  if (!context) {
    throw new Error('useSubjects must be used within a SubjectsProvider');
  }
  return context;
};

export const SubjectsProvider = ({ children }) => {
  const [subjects, setSubjects] = useState([]);

  // Load subjects from localStorage or use defaults
  useEffect(() => {
    const savedSubjects = localStorage.getItem('customSubjects');
    if (savedSubjects) {
      try {
        setSubjects(JSON.parse(savedSubjects));
      } catch {
        setSubjects([...ACTIVITY_FEED_SUBJECTS]);
      }
    } else {
      setSubjects([...ACTIVITY_FEED_SUBJECTS]);
    }
  }, []);

  const updateSubjects = (newSubjects) => {
    setSubjects(newSubjects);
    localStorage.setItem('customSubjects', JSON.stringify(newSubjects));
  };

  const addSubject = (subject) => {
    if (subject.trim() && !subjects.includes(subject.trim())) {
      const updatedSubjects = [...subjects, subject.trim()];
      updateSubjects(updatedSubjects);
      return true;
    }
    return false;
  };

  const editSubject = (index, newSubject) => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      const updatedSubjects = [...subjects];
      updatedSubjects[index] = newSubject.trim();
      updateSubjects(updatedSubjects);
      return true;
    }
    return false;
  };

  const deleteSubject = (index) => {
    const updatedSubjects = subjects.filter((_, i) => i !== index);
    updateSubjects(updatedSubjects);
  };

  const resetToDefaults = () => {
    updateSubjects([...ACTIVITY_FEED_SUBJECTS]);
  };

  const value = {
    subjects,
    addSubject,
    editSubject,
    deleteSubject,
    resetToDefaults,
    updateSubjects
  };

  return (
    <SubjectsContext.Provider value={value}>
      {children}
    </SubjectsContext.Provider>
  );
};

export default SubjectsContext;