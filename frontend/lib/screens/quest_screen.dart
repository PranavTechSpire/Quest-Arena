import 'package:flutter/material.dart';
import '../services/api_service.dart';

class QuestScreen extends StatefulWidget {
  const QuestScreen({Key? key}) : super(key: key);

  @override
  State<QuestScreen> createState() => _QuestScreenState();
}

class _QuestScreenState extends State<QuestScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _questions = [];
  int _currentIndex = 0;
  bool _isLoading = true;
  String? _selectedOption;
  bool _isSubmitted = false;
  Map<String, dynamic>? _feedback;
  DateTime _startTime = DateTime.now();

  @override
  void initState() {
    super.initState();
    _fetchQuests();
  }

  Future<void> _fetchQuests() async {
    try {
      final questions = await _apiService.getDailyQuests();
      setState(() {
        _questions = questions;
        _isLoading = false;
        _startTime = DateTime.now();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
        Navigator.of(context).pop();
      }
    }
  }

  Future<void> _submitAnswer() async {
    if (_selectedOption == null) return;
    
    final timeTakenMs = DateTime.now().difference(_startTime).inMilliseconds;
    final currentQ = _questions[_currentIndex];

    setState(() {
      _isLoading = true;
    });

    try {
      final feedback = await _apiService.submitQuest(currentQ['id'], _selectedOption!, timeTakenMs);
      setState(() {
        _feedback = feedback;
        _isSubmitted = true;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  void _nextQuestion() {
    if (_currentIndex < _questions.length - 1) {
      setState(() {
        _currentIndex++;
        _selectedOption = null;
        _isSubmitted = false;
        _feedback = null;
        _startTime = DateTime.now();
      });
    } else {
      // Completed all
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('Quest Complete! 🎉'),
          content: const Text('You have completed your daily questions. Check your dashboard for the updated streak!'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).pop();
              },
              child: const Text('Return to Dashboard'),
            )
          ],
        )
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _questions.isEmpty) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    
    if (_questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Daily Quest')),
        body: const Center(child: Text('No questions available right now.')),
      );
    }

    final currentQ = _questions[_currentIndex];
    final options = Map<String, String>.from(currentQ['options']);

    return Scaffold(
      appBar: AppBar(
        title: Text('Question ${_currentIndex + 1}/${_questions.length}'),
        automaticallyImplyLeading: false,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4.0),
          child: LinearProgressIndicator(
            value: (_currentIndex + 1) / _questions.length,
            backgroundColor: Colors.grey[800],
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6200EE)),
          ),
        ),
      ),
      body: _isLoading && _isSubmitted == false
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2C2C2C),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      currentQ['question_text'],
                      style: const TextStyle(fontSize: 18, height: 1.5),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  ...['a', 'b', 'c', 'd'].map((key) {
                    final isSelected = _selectedOption == key;
                    final isCorrect = _feedback?['correct_option'] == key;
                    
                    Color bgColor = const Color(0xFF1E1E1E);
                    Color borderColor = Colors.transparent;

                    if (_isSubmitted) {
                      if (isCorrect) {
                        bgColor = Colors.green.withOpacity(0.2);
                        borderColor = Colors.green;
                      } else if (isSelected && !isCorrect) {
                        bgColor = Colors.red.withOpacity(0.2);
                        borderColor = Colors.red;
                      }
                    } else if (isSelected) {
                      bgColor = const Color(0xFF6200EE).withOpacity(0.2);
                      borderColor = const Color(0xFF6200EE);
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: InkWell(
                        onTap: _isSubmitted ? null : () {
                          setState(() => _selectedOption = key);
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: bgColor,
                            border: Border.all(color: borderColor, width: 2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 14,
                                backgroundColor: borderColor == Colors.transparent ? Colors.grey[800] : borderColor,
                                child: Text(key.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 12)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Text(options[key] ?? '')),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),

                  const SizedBox(height: 24),
                  
                  if (_isSubmitted && _feedback != null) ...[
                    if (_feedback!['companion_message'] != null) ...[
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: Colors.purple.withOpacity(0.2),
                            child: const Text('🌟', style: TextStyle(fontSize: 24)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF2C2C2C),
                                borderRadius: const BorderRadius.only(
                                  topRight: Radius.circular(12),
                                  bottomLeft: Radius.circular(12),
                                  bottomRight: Radius.circular(12),
                                ),
                                border: Border.all(color: Colors.purple.withOpacity(0.5)),
                              ),
                              child: Text(
                                _feedback!['companion_message'],
                                style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.purpleAccent),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: _feedback!['is_correct'] ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _feedback!['is_correct'] ? Colors.green : Colors.red)
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _feedback!['is_correct'] ? 'Correct! (+${_feedback!['score_awarded']})' : 'Incorrect (${_feedback!['score_awarded']})',
                            style: TextStyle(
                              fontSize: 18, 
                              fontWeight: FontWeight.bold,
                              color: _feedback!['is_correct'] ? Colors.green : Colors.red,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text('Explanation:', style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text(_feedback!['explanation']),
                          const SizedBox(height: 8),
                          Text('Tips:', style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text(_feedback!['elimination_tips']),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _nextQuestion,
                      child: Text(_currentIndex < _questions.length - 1 ? 'Next Question' : 'Finish'),
                    ),
                  ] else ...[
                    ElevatedButton(
                      onPressed: _selectedOption == null ? null : _submitAnswer,
                      child: const Text('Submit Answer'),
                    ),
                  ]
                ],
              ),
            ),
    );
  }
}
