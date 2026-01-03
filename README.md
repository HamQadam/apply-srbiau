# Ghadam Platform: Product Roadmap & Technical Plan



# Crawler Roadmap

| Region           | Country        | Data Source                              | Authority Type                             | Link                                                         |
| ---------------- | -------------- | ---------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| Europe (EU-wide) | —              | **EURAXESS**                             | EU Commission (research & PhD positions)   | [https://euraxess.ec.europa.eu](https://euraxess.ec.europa.eu/) |
| Europe (EU-wide) | —              | **Erasmus Mundus Catalogue**             | European Commission (joint MSc)            | https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en |
| Europe           | Germany        | **DAAD International Program Database**  | German Govt / DAAD                         | https://www.daad.de/en/studying-in-germany                   |
| Europe           | Netherlands    | **Study in NL**                          | Dutch Ministry of Education                | [https://www.studyinnl.org](https://www.studyinnl.org/)      |
| Europe           | France         | **Campus France**                        | French Government                          | [https://www.campusfrance.org](https://www.campusfrance.org/) |
| Europe           | Sweden         | **UniversityAdmissions.se**              | Swedish Govt (official application portal) | [https://www.universityadmissions.se](https://www.universityadmissions.se/) |
| Europe           | Sweden         | **Study in Sweden**                      | Swedish Institute (govt)                   | [https://studyinsweden.se](https://studyinsweden.se/)        |
| Europe           | Denmark        | **Study in Denmark**                     | Danish Government                          | [https://studyindenmark.dk](https://studyindenmark.dk/)      |
| Europe           | Finland        | **Studyinfo.fi**                         | Finnish National Agency for Education      | [https://studyinfo.fi](https://studyinfo.fi/)                |
| Europe           | Norway         | **Study in Norway**                      | Norwegian Govt                             | [https://www.studyinnorway.no](https://www.studyinnorway.no/) |
| Europe           | Austria        | **Study in Austria (OeAD)**              | Austrian Government                        | [https://studyinaustria.at](https://studyinaustria.at/)      |
| Europe           | Switzerland    | **Swissuniversities**                    | National university association            | [https://www.swissuniversities.ch](https://www.swissuniversities.ch/) |
| Europe           | United Kingdom | **Study UK (British Council)**           | UK Government                              | [https://study-uk.britishcouncil.org](https://study-uk.britishcouncil.org/) |
| Europe           | United Kingdom | **UCAS Postgraduate Search**             | National admissions service                | https://www.ucas.com/postgraduate                            |
| North America    | Canada         | **EduCanada**                            | Government of Canada                       | [https://www.educanada.ca](https://www.educanada.ca/)        |
| North America    | Canada         | **CICIC Program Directory**              | Council of Ministers of Education          | [https://www.cicic.ca](https://www.cicic.ca/)                |
| North America    | United States  | **EducationUSA**                         | U.S. State Department                      | [https://educationusa.state.gov](https://educationusa.state.gov/) |
| North America    | United States  | **College Navigator (NCES/IPEDS)**       | U.S. Dept. of Education                    | https://nces.ed.gov/collegenavigator                         |
| Global (IDs)     | —              | **ROR – Research Organization Registry** | Global research registry (deduplication)   | [https://ror.org](https://ror.org/)                          |


# Problems 
# Ghadam UI/UX Improvement TODO List

This document outlines the tasks required to improve the user interface (UI) and user experience (UX) of the Ghadam application tracker.

---

### **General & High-Level**

- [ ] **Task 1: Establish a "Destructive Action" Confirmation Pattern.**
  -   **Description:** Implement a confirmation modal (e.g., "Are you sure?") for all destructive actions, starting with the "Delete Application" button on the detail page. This prevents accidental data loss.

- [ ] **Task 2: Create an Info-Tooltip Component.**
  -   **Description:** Develop a reusable tooltip component (an `(i)` icon) that can be clicked or hovered to reveal more information. This will be used to explain metrics like "Match %".

---

### **Homepage / Landing Page**

- [ ] **Task 3: Add a "Success Stories" Teaser Section.**
  -   **Description:** Below the main hero section, add a small section with 2-3 anonymized testimonials or data points (e.g., "75% of our users get accepted to at least one of their target schools"). This validates the "Learn from Success Stories" promise.

- [ ] **Task 4: Clarify the Purpose of "Ghadam Coins".**
  -   **Description:** Add a brief, one-sentence explanation under the "Earn Ghadam Coins" icon on the homepage. Example: "Earn coins for completing your profile and use them to unlock detailed program insights."

- [ ] **Task 5: Implement Separate Navigation for Logged-Out Users.**
  -   **Description:** Ensure that new visitors who are not logged in see "Sign Up" and "Log In" buttons in the navigation bar instead of the user dashboard links.

---

### **User Dashboard**

- [ ] **Task 6: Revise the "Docs Ready" Metric.**
  -   **Description:** Change the "3%" label to a more intuitive count, such as "Documents: 3/114". The progress bar can remain, but the primary text should be clearer.

- [ ] **Task 7: Adjust Color Logic for "Deadlines Soon" Stat.**
  -   **Description:** Change the color of the "Deadlines Soon" stat to be neutral (e.g., gray or black) or positive (e.g., green) when the count is zero. The current red color implies a warning incorrectly.

- [ ] **Task 8: Implement Info-Tooltip for "Match %".**
  -   **Description:** Add the new info-tooltip component next to the "95% match" label on program cards in the "Your Programs" section. The tooltip should briefly explain how this score is calculated (e.g., "Based on your academic profile, preferred country, and field of study.").

---

### **Explore & Recommendations Pages**

- [ ] **Task 9: Help Users Manage Large Result Sets.**
  -   **Description:** On the "Your Recommendations" page, if the number of matched programs exceeds a threshold (e.g., 100), display a message prompting the user to "Update Preferences" to get a more targeted list.

- [ ] **Task 10: Differentiate Information Tags with Color.**
  -   **Description:** On program cards in the "Explore" view, use distinct colors for different types of tags. For example:
      -   **Cost/Tuition:** Green for "Tuition-free", blue/gray for costs.
      -   **Deadlines:** Orange or red for upcoming deadlines to create urgency.

- [ ] **Task 11: Improve Readability of Long Filter Options.**
  -   **Description:** In the dropdown filters ("All Fields"), either widen the dropdown menu to prevent awkward text wrapping or truncate long lines with an ellipsis (`...`) and show the full text in a tooltip on hover.

- [ ] **Task 12: Update Filter Button Text to Reflect Selections.**
  -   **Description:** When a user selects an item from a filter dropdown (e.g., "Germany"), update the main filter button text from "All Countries" to something more descriptive like "Germany" or "2 Countries".

---

### **Application Detail Page**

- [ ] **Task 13: Add an "Add Date" Micro-Interaction.**
  -   **Description:** For date fields that show "Not set" (like "Deadline"), make the text a clickable link or add a small button that opens the date-picker. This encourages users to input data.

- [ ] **Task 14: Clarify "Required" Document Labels.**
  -   **Description:** On the "Document Checklist", replace the red asterisk `(*)` with a less ambiguous text label like `(required)` next to the item name for better clarity.

- [ ] **Task 15: Increase Spacing for "Delete Application" Button.**
  -   **Description:** On the main application card, add more space between the "Target" button and the delete (trash can) icon to reduce the chance of accidental clicks.