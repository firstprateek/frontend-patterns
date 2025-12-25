## Requirements

- Data will be a nested json like in mockFileData.js
- User should be able to expand or close a folder
- User should be able to delete the files
- User should be able to scroll at 60fps even with large number of files (>50k)

### Design

- Maintain a close/expanded state per folder
- Normalize the data
	- Flat file structure can be virtualized for performance
	- Deletion is faster as the lookup in O(1)

### Puzzles

- Should DFS be used instead of recursion to create the flat list ?
- Should the folders be sorted towards the top
- Does this virtualization approach work on other problemns such as newsfeed, google photos etc.

### Learnings:

- When flattening the list have a metaData + view data strcuture
	- metadata is for quick lookup & maintains overall state
	- view is what is used for rendering

### Advanced

- "If I delete a folder with 5,000 children, how do you update the list without freezing the UI?"
- "How do we animate the expansion of a folder? Since it's a virtual list, the items pop into existence instantly."
- "Network latency: The delete API takes 1 second. Implementation Optimistic UI."
