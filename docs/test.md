- approach, goal, stage

a. Approach (code visibility)

- Blackbox: input -> blackbox -> output
- Whitebox: input -> white box (có các nhánh) -> output : chạy đủ các nhánh
- Graybox: White + Black: Biết 1 ít hộp trắng.

b. Goal (functional & non-functional test)

- Functional: Unit (programmer), integrity (leader), system (project manager). (alpha test)
  (kết quả: Acceptance, regression)
- Non-functional -> (perfomance, quality) <atributes không liên quan đến function>

c. Stages

(

- Unit -> isolation: Tách các đơn thể ra và kiểm tra chéo
- Integrity -> together: Kiểm tra các đơn thể với nhau
- System -> Environment: Kiểm tra toàn bộ chương trình trên môi trường mirror.
  ) <Programmer (alpha test)>

(Acceptance -> End user, stakeholder) <Beta test>

Mục tiêu test là tìm được lỗi
-> fix bugs (detect)

Methologies & tool for testing

- Manual -> Tester
- (Automated -> Scripts & (tools -> Jira / Github)) -> Regression (phóng đại / phản chứng)

Common functional vs non functional testing

- Performance
  - Speed
  - Scalability
  - Stability
    -> Robusness

- Security
  - Vulnerability (from unauthorized users)

- Usability
  - Easy
  - Intuitive
